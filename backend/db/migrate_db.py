"""为已有数据库增加评价、消息表，保留现有账号、订单及业务数据。"""
import argparse
from pathlib import Path
import sqlite3


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path(__file__).with_name("app.db"))
    args = parser.parse_args()
    migrations = Path(__file__).resolve().parents[2] / "backend-java/src/main/resources/db/migrations"
    with sqlite3.connect(args.db.resolve().as_uri() + "?mode=rw", uri=True) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        sql = "\n".join((migrations / name).read_text(encoding="utf-8")
                        for name in ("001-rating.sql", "002-notification.sql"))
        conn.executescript("BEGIN;\n" + sql + "\nCOMMIT;")
    print("评价和消息数据库迁移完成，原有数据保留。")


if __name__ == "__main__":
    main()
