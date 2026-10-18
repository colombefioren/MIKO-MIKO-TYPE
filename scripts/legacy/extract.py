"""Extracts the Miko-Miko tables from a pg_dumpall file into a `legacy` schema.

Every column is created as text so the dump loads regardless of the old types;
transform.sql casts values while copying them into the new schema.
"""

import re
import sys

TABLES = {
    "auth.users": "auth_users",
    "auth.identities": "auth_identities",
    "public.profiles": "profiles",
    "public.game_results": "game_results",
    "public.friends": "friends",
    "public.posts": "posts",
    "public.likes": "likes",
    "public.comments": "comments",
    "public.chats": "chats",
    "public.messages": "messages",
    "public.notifications": "notifications",
}

COPY_RE = re.compile(r"^COPY (\w+\.\w+) \((.*)\) FROM stdin;$")
COLUMN_RE = re.compile(r"^[a-z_][a-z0-9_]*$")


def main(dump_path, out_path):
    found = set()
    with open(dump_path, encoding="utf-8") as dump, open(out_path, "w", encoding="utf-8") as out:
        out.write("drop schema if exists legacy cascade;\ncreate schema legacy;\n\n")
        lines = iter(dump)
        for line in lines:
            match = COPY_RE.match(line.rstrip("\n"))
            if not match:
                continue
            wanted = match.group(1) in TABLES
            if wanted and match.group(1) in found:
                sys.exit(f"Table appears twice in the dump: {match.group(1)}")

            columns = [c.strip().strip('"') for c in match.group(2).split(",")]
            if wanted and not all(COLUMN_RE.match(c) for c in columns):
                sys.exit(f"Unexpected column names for {match.group(1)}")

            if wanted:
                name = TABLES[match.group(1)]
                quoted = [f'"{c}"' for c in columns]
                out.write(f"create table legacy.{name} ({', '.join(f'{c} text' for c in quoted)});\n")
                out.write(f"copy legacy.{name} ({', '.join(quoted)}) from stdin;\n")

            # Consume the whole data block, kept or not, so its rows are never parsed as SQL.
            for row in lines:
                if wanted:
                    out.write(row)
                if row.rstrip("\n") == "\\.":
                    break
            if wanted:
                out.write("\n")
                found.add(match.group(1))

    missing = set(TABLES) - found
    if missing:
        sys.exit(f"Tables missing from the dump: {', '.join(sorted(missing))}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: extract.py <dump.sql> <out.sql>")
    main(sys.argv[1], sys.argv[2])
