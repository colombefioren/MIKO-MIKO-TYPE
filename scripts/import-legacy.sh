#!/usr/bin/env bash
# Imports a Miko-Miko backup (pg_dumpall .gz and storage .zip) into a Typhoon database.
#
#   scripts/import-legacy.sh <cluster-dump.gz> <storage.zip>
#
# Defaults target the local stack from `npm run db:start`. For a hosted project set:
#   DB_URL            postgresql connection string (Project Settings > Database)
#   SUPABASE_URL      https://<ref>.supabase.co
#   SERVICE_ROLE_KEY  service role key, only used here to upload files. Never ship it to the browser.
#
# Requires: python3, psql, unzip, curl.

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <cluster-dump.gz> <storage.zip>" >&2
  exit 1
fi

DUMP="$1"
STORAGE_ZIP="$2"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
# Public demo key of the local Supabase stack.
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"

for tool in python3 psql unzip curl realpath; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Extracting tables from the dump"
gunzip -c "$DUMP" > "$WORK/dump.sql"
python3 -I "$HERE/legacy/extract.py" "$WORK/dump.sql" "$WORK/legacy.sql"

echo "Loading legacy tables"
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$WORK/legacy.sql"

echo "Copying data into the Typhoon schema"
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -v base_url="$SUPABASE_URL" -f "$HERE/legacy/transform.sql"

echo "Uploading images"
mkdir -p "$WORK/files"
unzip -q "$STORAGE_ZIP" -d "$WORK/files"
# The archive has one folder named after the old project ref.
ROOT="$(find "$WORK/files" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
ROOT_REAL="$(realpath -e "$ROOT")"
psql "$DB_URL" -q -At -F $'\t' -c "select old_bucket, old_path, new_bucket, new_path from legacy.uploads" > "$WORK/uploads.tsv"

uploaded=0
missing=()
while IFS=$'\t' read -r old_bucket old_path new_bucket new_path; do
  file="$ROOT/$old_bucket/$old_path"
  # Only regular files inside the extracted archive: no symlinks, nothing outside it.
  real="$(realpath -e "$file" 2>/dev/null || true)"
  if [[ -L "$file" || -z "$real" || "$real" != "$ROOT_REAL/"* || ! -f "$real" ]]; then
    missing+=("$new_bucket/$new_path")
    continue
  fi
  case "${new_path##*.}" in
    jpg) type="image/jpeg" ;;
    *) type="image/${new_path##*.}" ;;
  esac
  curl -sf -o /dev/null -X POST "$SUPABASE_URL/storage/v1/object/$new_bucket/$new_path" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Content-Type: $type" \
    -H "x-upsert: true" \
    --data-binary "@$real"
  uploaded=$((uploaded + 1))
done < "$WORK/uploads.tsv"
echo "Uploaded $uploaded files"

# Clear references to files that were not in the archive so no broken images show up.
for path in ${missing[@]+"${missing[@]}"}; do
  echo "Missing in archive, reference removed: $path"
  bucket="${path%%/*}"
  url="$SUPABASE_URL/storage/v1/object/public/$path"
  if [[ "$bucket" == "avatars" ]]; then
    psql "$DB_URL" -q -v ON_ERROR_STOP=1 -v url="$url" <<< "update public.profiles set avatar_url = null where avatar_url = :'url';"
  else
    psql "$DB_URL" -q -v ON_ERROR_STOP=1 -v url="$url" <<< "update public.posts set image_url = null where image_url = :'url' and content <> ''; delete from public.posts where image_url = :'url';"
  fi
done

psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "set client_min_messages = warning; drop schema legacy cascade"
echo "Import finished"
