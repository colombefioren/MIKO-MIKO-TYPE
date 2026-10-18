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


def main(dump_path, out_path):
    found = set()
    with open(dump_path, encoding="utf-8") as dump, open(out_path, "w", encoding="utf-8") as out:
        out.write("drop schema if exists legacy cascade;\ncreate schema legacy;\n\n")
        lines = iter(dump)
        for line in lines:
            match = COPY_RE.match(line.rstrip("\n"))
            if not match or match.group(1) not in TABLES:
                continue
            name = TABLES[match.group(1)]
            columns = [c.strip() for c in match.group(2).split(",")]
            column_defs = ", ".join(f"{c} text" for c in columns)
            out.write(f"create table legacy.{name} ({column_defs});\n")
            out.write(f"copy legacy.{name} ({', '.join(columns)}) from stdin;\n")
            for row in lines:
                out.write(row)
                if row.rstrip("\n") == "\\.":
                    break
            out.write("\n")
            found.add(match.group(1))

    missing = set(TABLES) - found
    if missing:
        sys.exit(f"Tables missing from the dump: {', '.join(sorted(missing))}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: extract.py <dump.sql> <out.sql>")
    main(sys.argv[1], sys.argv[2])
