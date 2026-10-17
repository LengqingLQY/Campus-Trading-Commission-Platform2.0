"""为已有数据库增加评价表，保留现有账号、订单及业务数据。"""
import argparse
from pathlib import Path
import sqlite3


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path(__file__).with_name("app.db"))
    args = parser.parse_args()
    migration = (Path(__file__).resolve().parents[2] / "backend-java/src/main/resources/db/migrations/001-rating.sql")
    with sqlite3.connect(args.db.resolve().as_uri() + "?mode=rw", uri=True) as conn:
        conn.executescript(migration.read_text(encoding="utf-8"))
    print("评价数据库迁移完成，原有数据保留。")


if __name__ == "__main__":
    main()
