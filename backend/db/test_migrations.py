"""验证增量升级保留数据、消息约束和重建顺序；只使用临时数据库。"""
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import init_db


class MigrationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ctcp-migration-")
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / "test.db"
        self.conn = sqlite3.connect(self.db)
        self.addCleanup(self.conn.close)
        self.conn.executescript(Path(init_db.SCHEMA_PATH).read_text(encoding="utf-8"))
        self.conn.execute("PRAGMA foreign_keys=ON")
        self.conn.execute("INSERT INTO user(id,account,password_hash,username) VALUES(1,'seller','unused','卖家'),(2,'buyer','unused','买家')")
        self.conn.execute("INSERT INTO product(id,seller_id,title,status) VALUES(1,1,'历史商品','completed')")
        self.conn.execute("INSERT INTO product_order(id,product_id,seller_id,buyer_id,status) VALUES(1,1,1,2,'completed')")
        self.conn.execute("INSERT INTO rating(product_order_id,reviewer_id,reviewee_id,reviewee_role,stars) VALUES(1,2,1,'seller',5)")
        self.conn.commit()

    def test_cli_upgrade_repeat_preserves_existing_data_and_messages(self):
        self.conn.execute("DROP TABLE notification")
        self.conn.commit()
        migrate = Path(__file__).with_name("migrate_db.py")
        subprocess.run([sys.executable, str(migrate), "--db", str(self.db)], check=True, capture_output=True)
        self.assertEqual(0, self.conn.execute("SELECT COUNT(*) FROM notification").fetchone()[0])
        self.conn.execute("INSERT INTO notification(recipient_id,type,title,content,target_type,target_id) VALUES(1,'order_completed','完成','可以评价','product_order',1)")
        self.conn.commit()
        subprocess.run([sys.executable, str(migrate), "--db", str(self.db)], check=True, capture_output=True)
        for table, count in (("user", 2), ("product_order", 1), ("rating", 1), ("notification", 1)):
            self.assertEqual(count, self.conn.execute("SELECT COUNT(*) FROM " + table).fetchone()[0])
        self.assertEqual([], self.conn.execute("PRAGMA foreign_key_check").fetchall())
        self.assertEqual("ok", self.conn.execute("PRAGMA integrity_check").fetchone()[0])

    def test_notification_constraints_and_indexes(self):
        statement = "INSERT INTO notification(recipient_id,type,title,content,target_type,target_id) VALUES(?,?,'标题','正文',?,1)"
        for values in ((999, "order_created", "product_order"), (1, "unknown", "product_order"), (1, "order_created", "external_url")):
            with self.assertRaises(sqlite3.IntegrityError):
                self.conn.execute(statement, values)
        indexes = {row[1] for row in self.conn.execute("PRAGMA index_list(notification)")}
        self.assertIn("idx_notification_recipient_time", indexes)
        self.assertIn("idx_notification_unread_time", indexes)

    def test_reinitialization_drops_notifications_before_users(self):
        self.conn.execute("INSERT INTO notification(recipient_id,type,title,content,target_type,target_id) VALUES(1,'order_completed','完成','可以评价','product_order',1)")
        self.conn.commit()
        init_db.drop_all(self.conn)
        init_db.create_schema(self.conn)
        self.assertEqual(0, self.conn.execute("SELECT COUNT(*) FROM notification").fetchone()[0])
        self.assertEqual(0, self.conn.execute("SELECT COUNT(*) FROM user").fetchone()[0])


if __name__ == "__main__":
    unittest.main()
