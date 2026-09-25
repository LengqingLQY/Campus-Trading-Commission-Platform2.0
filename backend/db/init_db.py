#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
校园跑腿交易平台 —— 数据库初始化脚本

用法：
    python init_db.py              # 重建数据库 + 预置账号 + 造演示数据
    python init_db.py --no-demo    # 只建表 + 预置账号，不造演示数据
    python init_db.py --db 路径     # 指定数据库文件位置

注意：脚本会删除并重建所有表，已有数据会丢失。可反复执行。

关于密码哈希：
    优先使用 werkzeug.security.generate_password_hash，并显式指定 PBKDF2；
    若环境还没装 Flask，则用标准库 hashlib 生成 **格式完全一致** 的哈希
    （pbkdf2:sha256:600000$盐$哈希）。装上 Flask 之后，
    werkzeug.security.check_password_hash 可以直接校验本脚本生成的密码。
"""

import argparse
import hashlib
import os
import secrets
import sqlite3
import string
import sys
from datetime import datetime, timedelta

# Windows 下输出被重定向（Git Bash、管道、重定向到文件）时，Python 默认用 GBK 编码，
# 中文会变乱码。这里只在非终端场景下强制 UTF-8，cmd/PowerShell 里保持原样。
if not sys.stdout.isatty():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "app.db")

# 建表顺序的倒序，先删子表再删父表
DROP_ORDER = ["product_order_termination_request", "task_termination_request", "product_order", "task_order", "product", "task", "user"]
VIEWS = ["v_public_task", "v_public_product"]


# --------------------------------------------------------------------------
# 密码哈希
# --------------------------------------------------------------------------
PBKDF2_ITERATIONS = 600000  # 与 werkzeug 3.x 默认值保持一致


def _fallback_generate_password_hash(password, salt_length=16):
    """werkzeug 未安装时的替代实现，输出格式与 werkzeug 完全一致。"""
    alphabet = string.ascii_letters + string.digits
    salt = "".join(secrets.choice(alphabet) for _ in range(salt_length))
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()
    return "pbkdf2:sha256:%d$%s$%s" % (PBKDF2_ITERATIONS, salt, digest)


try:
    from werkzeug.security import generate_password_hash as _werkzeug_generate_password_hash

    def generate_password_hash(password, salt_length=16):
        """显式固定 PBKDF2，避免新版 Werkzeug 默认改用 Java 端不支持的 scrypt。"""
        return _werkzeug_generate_password_hash(
            password,
            method="pbkdf2:sha256:%d" % PBKDF2_ITERATIONS,
            salt_length=salt_length,
        )

    HASH_SOURCE = "werkzeug(pbkdf2:sha256:%d)" % PBKDF2_ITERATIONS
except ImportError:
    generate_password_hash = _fallback_generate_password_hash
    HASH_SOURCE = "hashlib(与 werkzeug 格式兼容)"


# --------------------------------------------------------------------------
# 预置账号：当前验收使用两个以上普通用户；admin 账号和审核/删除演示数据
# 仅为兼容既有数据库结构与后续管理员模块保留，不属于当前接口闭环。
# --------------------------------------------------------------------------
PRESET_USERS = [
    # (account, password, username, qq, wechat, phone, role)
    ("admin", "admin123", "系统管理员", "", "", "", "admin"),
    ("alice", "alice123", "爱丽丝", "10001", "wx_alice", "13800000001", "user"),
    ("bob", "bob123", "鲍勃", "10002", "wx_bob", "13800000002", "user"),
    ("carol", "carol123", "卡罗尔", "10003", "wx_carol", "13800000003", "user"),
]

ADMIN_ID, ALICE_ID, BOB_ID, CAROL_ID = 1, 2, 3, 4


def _ts(**kwargs):
    """生成 'YYYY-MM-DD HH:MM:SS' 格式的相对时间，用于把演示数据摊开在不同时间点。"""
    return (datetime.now() - timedelta(**kwargs)).strftime("%Y-%m-%d %H:%M:%S")


def build_demo_tasks():
    """演示任务：覆盖待审核/已通过/已驳回/已接取/已完成/已删除全部状态。"""
    return [
        # (publisher_id, title, description, pickup, delivery, deadline, amount,
        #  contact, audit_status, audit_remark, status, is_deleted, deleted_by,
        #  deleted_at, created_at)
        (ALICE_ID, "代取快递（菜鸟驿站）", "两个小包裹，不重，麻烦帮忙带到女生宿舍楼下。",
         "菜鸟驿站(三食堂旁)", "紫金公寓2号楼", _ts(days=-1), 5.0, "QQ:10001",
         "approved", None, "open", 0, None, None, _ts(days=5)),

        (ALICE_ID, "帮忙带一份外卖", "在南门取外卖，帮忙送到实验楼，谢谢。",
         "学校南门", "计算机实验楼A301", _ts(days=-1), 8.5, "微信:wx_alice",
         "approved", None, "accepted", 0, None, None, _ts(days=4)),

        (BOB_ID, "打印课程论文并送到宿舍", "论文已发邮箱，双面打印装订，费用另算。",
         "图书馆一楼打印室", "紫金公寓5号楼", _ts(days=-2), 12.0, "电话:13800000002",
         "approved", None, "completed", 0, None, None, _ts(days=3)),

        (ALICE_ID, "代拿药品", "校医院取药，凭取药单，急。",
         "校医院", "紫金公寓2号楼", _ts(days=-1), 6.0, "QQ:10001",
         "pending", None, "open", 0, None, None, _ts(days=2)),

        (BOB_ID, "帮忙排队买演唱会票", "线下排队代抢票，价格好商量。",
         "市中心售票点", "学校北门", _ts(days=-3), 50.0, "电话:13800000002",
         "rejected", "涉及校外代抢票，不属于校园跑腿范围", "open", 0, None, None, _ts(days=2)),

        (CAROL_ID, "刷单兼职日结高薪", "日结三百，加微信详聊。",
         "线上", "线上", _ts(days=-5), 100.0, "微信:wx_carol",
         "approved", None, "open", 1, ADMIN_ID, _ts(hours=20), _ts(days=1)),

        (CAROL_ID, "图书馆占座并带份早餐", "早上八点前占到二楼靠窗位置即可。",
         "二食堂", "图书馆二楼", _ts(days=-1), 3.0, "QQ:10003",
         "approved", None, "open", 0, None, None, _ts(days=1)),

        (BOB_ID, "搬运行李到南门", "两个24寸行李箱，需要力气大一点的同学。",
         "紫金公寓5号楼", "学校南门", _ts(days=-2), 20.0, "电话:13800000002",
         "approved", None, "open", 0, None, None, _ts(hours=6)),

        (ALICE_ID, "带一份三食堂的糖醋排骨", "已经送到宿舍楼下了，等发布者确认收到。",
         "三食堂", "紫金公寓2号楼", _ts(hours=-2), 4.0, "QQ:10001",
         "approved", None, "delivered", 0, None, None, _ts(hours=4)),
    ]


def build_demo_products():
    """演示商品：覆盖待审核/已通过/已驳回/在售/已售出全部状态。"""
    return [
        # (seller_id, title, description, category, condition, price, location,
        #  contact, audit_status, audit_remark, status, is_deleted, deleted_by,
        #  deleted_at, created_at)
        (ALICE_ID, "考研数学复习全书", "只做了前三章，其余全新，无笔记无划线。",
         "book", "almost_new", 35.0, "紫金公寓2号楼下", "QQ:10001",
         "approved", None, "on_sale", 0, None, None, _ts(days=5)),

        (BOB_ID, "罗技无线鼠标 M170", "用了半年，功能完好，送一节新电池。",
         "electronic", "good", 45.0, "计算机实验楼门口", "微信:wx_bob",
         "approved", None, "sold", 0, None, None, _ts(days=4)),

        (CAROL_ID, "宿舍护眼小台灯", "USB供电，三档亮度，搬宿舍用不上了。",
         "daily", "good", 15.0, "紫金公寓7号楼下", "QQ:10003",
         "pending", None, "on_sale", 0, None, None, _ts(days=3)),

        (ALICE_ID, "代购茅台整箱", "原箱未拆，可小刀。",
         "other", "new", 2000.0, "校外", "电话:13800000001",
         "rejected", "非校园二手物品，且涉及高价代购", "on_sale", 0, None, None, _ts(days=2)),

        (BOB_ID, "斯伯丁篮球", "打了几次，气足，室外场耐磨款。",
         "sports", "good", 60.0, "体育馆篮球场", "微信:wx_bob",
         "approved", None, "on_sale", 0, None, None, _ts(days=1)),

        (CAROL_ID, "冬季加厚外套 全新", "买大了一码，吊牌还在，L码。",
         "clothing", "new", 80.0, "紫金公寓7号楼下", "QQ:10003",
         "approved", None, "on_sale", 0, None, None, _ts(hours=5)),
    ]


# --------------------------------------------------------------------------
# 建库
# --------------------------------------------------------------------------
def drop_all(conn):
    conn.execute("PRAGMA foreign_keys = OFF")
    for view in VIEWS:
        conn.execute("DROP VIEW IF EXISTS %s" % view)
    for table in DROP_ORDER:
        conn.execute("DROP TABLE IF EXISTS %s" % table)
    conn.commit()


def create_schema(conn):
    if not os.path.exists(SCHEMA_PATH):
        sys.exit("找不到建表脚本：%s" % SCHEMA_PATH)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()


def insert_users(conn):
    rows = [
        (account, generate_password_hash(password), username, qq, wechat, phone, role)
        for account, password, username, qq, wechat, phone, role in PRESET_USERS
    ]
    conn.executemany(
        """INSERT INTO user (account, password_hash, username, qq, wechat, phone, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        rows,
    )
    conn.commit()


def insert_demo(conn):
    conn.executemany(
        """INSERT INTO task
             (publisher_id, title, description, pickup, delivery, deadline, amount,
              contact, audit_status, audit_remark, status, is_deleted, deleted_by,
              deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [row + (row[-1],) for row in build_demo_tasks()],  # updated_at 先与 created_at 相同
    )

    conn.executemany(
        """INSERT INTO product
             (seller_id, title, description, category, condition, price, location,
              contact, audit_status, audit_remark, status, is_deleted, deleted_by,
              deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [row + (row[-1],) for row in build_demo_products()],
    )

    # 任务2 bob 接了还在跑；任务3 alice 接的、已走完双方确认；任务9 已送达、等发布者确认
    conn.executemany(
        """INSERT INTO task_order
             (task_id, publisher_id, accepter_id, status, created_at, delivered_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (2, ALICE_ID, BOB_ID, "accepted", _ts(days=3, hours=12), None, None),
            (3, BOB_ID, ALICE_ID, "completed", _ts(days=2, hours=20), _ts(days=2, hours=4), _ts(days=2)),
            (9, ALICE_ID, BOB_ID, "delivered", _ts(hours=3), _ts(hours=2), None),
        ],
    )

    # 商品2（罗技鼠标）被 alice 买走，状态 created（待卖家交付）
    conn.execute(
        """INSERT INTO product_order
             (product_id, seller_id, buyer_id, price, status, created_at, delivered_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (2, BOB_ID, ALICE_ID, 45.0, "created", _ts(days=3, hours=8), None, None),
    )
    conn.commit()


def print_summary(conn, db_path, with_demo):
    print("\n数据库已生成：%s" % db_path)
    print("密码哈希来源：%s\n" % HASH_SOURCE)

    print("预置账号：")
    print("  %-10s %-12s %s" % ("账号", "密码", "角色"))
    for account, password, _, _, _, _, role in PRESET_USERS:
        print("  %-10s %-12s %s" % (account, password, "管理员" if role == "admin" else "普通用户"))

    counts = [
        ("user", "用户"),
        ("task", "跑腿任务"),
        ("product", "二手商品"),
        ("task_order", "跑腿记录"),
        ("product_order", "购买记录"),
    ]
    print("\n各表数据量：")
    for table, label in counts:
        n = conn.execute("SELECT COUNT(*) FROM %s" % table).fetchone()[0]
        print("  %-16s %-10s %d 条" % (table, label, n))

    if with_demo:
        n_task = conn.execute("SELECT COUNT(*) FROM v_public_task").fetchone()[0]
        n_product = conn.execute("SELECT COUNT(*) FROM v_public_product").fetchone()[0]
        print("\n普通用户可见（已过滤未审核和已删除）：任务 %d 条，商品 %d 条" % (n_task, n_product))


def main():
    parser = argparse.ArgumentParser(description="初始化校园跑腿交易平台数据库")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="数据库文件路径")
    parser.add_argument("--no-demo", action="store_true", help="不插入演示数据")
    args = parser.parse_args()

    db_path = os.path.abspath(args.db)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        drop_all(conn)
        create_schema(conn)
        conn.execute("PRAGMA foreign_keys = ON")
        insert_users(conn)
        if not args.no_demo:
            insert_demo(conn)
        print_summary(conn, db_path, not args.no_demo)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
