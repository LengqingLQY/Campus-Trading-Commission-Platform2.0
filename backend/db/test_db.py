#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
校园跑腿交易平台 —— 数据库约束与查询验证脚本

用法：
    python test_db.py

作用：
    在临时数据库上验证两件事，不会动到 app.db。
    1. 反例测试：需求 §6 的业务规则在数据库层是否真的拦得住脏数据
       （重复账号、重复接取、自接取、自购买、非法状态、负金额、外键悬空）
    2. 正例测试：验收清单要演示的查询是否都能出数据
       （关键词检索、按时间排序、按金额排序、个人空间三个列表、未审核内容不泄漏）

对应实习计划「用AI完成尽可能多的测试与验证」，可反复执行。
"""

import os
import sqlite3
import sys
import tempfile

if not sys.stdout.isatty():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import init_db  # noqa: E402

ALICE, BOB = init_db.ALICE_ID, init_db.BOB_ID

passed = 0
failed = 0


def expect_reject(conn, case, sql, params):
    """反例：这条 SQL 必须被数据库拒绝。执行成功反而是测试失败。"""
    global passed, failed
    try:
        conn.execute(sql, params)
        conn.rollback()
        print("  [失败] %s —— 数据库竟然接受了这条脏数据" % case)
        failed += 1
    except sqlite3.IntegrityError as e:
        conn.rollback()
        print("  [通过] %s —— 已拦截：%s" % (case, e))
        passed += 1


def expect_rows(case, rows, at_least=1, show=None):
    """正例：这条查询必须能查出数据。"""
    global passed, failed
    if len(rows) >= at_least:
        detail = " | ".join(show(r) for r in rows) if show else "%d 条" % len(rows)
        print("  [通过] %s —— %s" % (case, detail))
        passed += 1
    else:
        print("  [失败] %s —— 查到 %d 条，至少应有 %d 条" % (case, len(rows), at_least))
        failed += 1


def expect_empty(case, rows):
    global passed, failed
    if not rows:
        print("  [通过] %s —— 确认查不到" % case)
        passed += 1
    else:
        print("  [失败] %s —— 不该出现却查到了 %d 条" % (case, len(rows)))
        failed += 1


def test_constraints(conn):
    print("\n【一】业务规则的数据库层兜底（以下每条都应被拦截）")

    expect_reject(
        conn, "注册重复账号（UNIQUE account）",
        "INSERT INTO user (account, password_hash, username) VALUES (?, ?, ?)",
        ("alice", "x", "冒名的爱丽丝"),
    )

    expect_reject(
        conn, "同一任务被第二个人接取（UNIQUE task_id）",
        """INSERT INTO task_order (task_id, publisher_id, accepter_id)
           VALUES (?, ?, ?)""",
        (2, ALICE, init_db.CAROL_ID),  # 任务2 已被 bob 接取
    )

    expect_reject(
        conn, "接取自己发布的任务（CHECK accepter <> publisher）",
        """INSERT INTO task_order (task_id, publisher_id, accepter_id)
           VALUES (?, ?, ?)""",
        (1, ALICE, ALICE),
    )

    expect_reject(
        conn, "购买自己发布的商品（CHECK buyer <> seller）",
        """INSERT INTO product_order (product_id, seller_id, buyer_id, price)
           VALUES (?, ?, ?, ?)""",
        (1, ALICE, ALICE, 35.0),
    )

    expect_reject(
        conn, "同一商品被重复购买（UNIQUE product_id）",
        """INSERT INTO product_order (product_id, seller_id, buyer_id, price)
           VALUES (?, ?, ?, ?)""",
        (2, BOB, init_db.CAROL_ID, 45.0),  # 商品2 已被 alice 买走
    )

    expect_reject(
        conn, "写入枚举外的任务状态（CHECK status）",
        """INSERT INTO task (publisher_id, title, pickup, delivery, status)
           VALUES (?, ?, ?, ?, ?)""",
        (ALICE, "状态乱写的任务", "A", "B", "随便写个状态"),
    )

    expect_reject(
        conn, "写入负数跑腿费（CHECK amount >= 0）",
        """INSERT INTO task (publisher_id, title, pickup, delivery, amount)
           VALUES (?, ?, ?, ?, ?)""",
        (ALICE, "负数金额任务", "A", "B", -1),
    )

    expect_reject(
        conn, "发布者指向不存在的用户（FOREIGN KEY）",
        """INSERT INTO task (publisher_id, title, pickup, delivery)
           VALUES (?, ?, ?, ?)""",
        (9999, "幽灵用户的任务", "A", "B"),
    )

    expect_reject(
        conn, "写入枚举外的跑腿记录状态（CHECK task_order.status）",
        """INSERT INTO task_order (task_id, publisher_id, accepter_id, status)
           VALUES (?, ?, ?, ?)""",
        (1, ALICE, BOB, "已经送到了"),
    )


def test_queries(conn):
    print("\n【二】验收要演示的查询（以下每条都应查得到数据）")

    # --- 关键词检索：只在审核通过且未删除的范围内搜 ---
    kw = "%快递%"
    rows = conn.execute(
        """SELECT id, title FROM v_public_task
            WHERE title LIKE ? OR description LIKE ?""", (kw, kw)
    ).fetchall()
    expect_rows("关键词检索任务「快递」", rows, show=lambda r: "#%d %s" % (r[0], r[1]))

    kw = "%鼠标%"
    rows = conn.execute(
        """SELECT id, title FROM v_public_product
            WHERE title LIKE ? OR description LIKE ?""", (kw, kw)
    ).fetchall()
    expect_rows("关键词检索商品「鼠标」", rows, show=lambda r: "#%d %s" % (r[0], r[1]))

    # --- 排序 ---
    rows = conn.execute(
        "SELECT title, created_at FROM v_public_task ORDER BY created_at DESC"
    ).fetchall()
    expect_rows("任务按发布时间倒序", rows, at_least=2,
                show=lambda r: "%s(%s)" % (r[0][:6], r[1][5:16]))

    rows = conn.execute(
        "SELECT title, amount FROM v_public_task ORDER BY amount DESC"
    ).fetchall()
    expect_rows("任务按跑腿费从高到低", rows, at_least=2,
                show=lambda r: "%s ¥%.1f" % (r[0][:6], r[1]))

    rows = conn.execute(
        "SELECT title, price FROM v_public_product ORDER BY price ASC"
    ).fetchall()
    expect_rows("商品按价格从低到高", rows, at_least=2,
                show=lambda r: "%s ¥%.1f" % (r[0][:6], r[1]))

    # --- 个人空间三个列表 ---
    rows = conn.execute(
        """SELECT id, title, audit_status, status FROM task
            WHERE publisher_id = ? AND is_deleted = 0
            ORDER BY created_at DESC""", (ALICE,)
    ).fetchall()
    expect_rows("个人空间：alice 我发布的任务", rows, at_least=2,
                show=lambda r: "#%d %s[%s/%s]" % (r[0], r[1][:6], r[2], r[3]))

    rows = conn.execute(
        """SELECT t.id, t.title, o.status FROM task_order o
             JOIN task t ON t.id = o.task_id
            WHERE o.accepter_id = ?""", (BOB,)
    ).fetchall()
    expect_rows("个人空间：bob 我接取的任务", rows,
                show=lambda r: "#%d %s[%s]" % (r[0], r[1][:8], r[2]))

    rows = conn.execute(
        """SELECT p.id, p.title, o.price FROM product_order o
             JOIN product p ON p.id = o.product_id
            WHERE o.buyer_id = ?""", (ALICE,)
    ).fetchall()
    expect_rows("个人空间：alice 我购买的商品", rows,
                show=lambda r: "#%d %s ¥%.1f" % (r[0], r[1][:8], r[2]))

    # --- 预留审核状态（当前不提供管理员接口） ---
    rows = conn.execute(
        "SELECT id, title FROM task WHERE audit_status = 'pending'"
    ).fetchall()
    expect_rows("预留审核状态：待审核任务", rows, show=lambda r: "#%d %s" % (r[0], r[1]))

    # --- 双方确认流程：两个待办列表 ---
    rows = conn.execute(
        """SELECT t.id, t.title FROM task_order o
             JOIN task t ON t.id = o.task_id
            WHERE o.publisher_id = ? AND o.status = 'delivered'""", (ALICE,)
    ).fetchall()
    expect_rows("发布者：待我确认收到的任务", rows,
                show=lambda r: "#%d %s" % (r[0], r[1][:10]))

    rows = conn.execute(
        """SELECT t.id, t.title, o.status FROM task_order o
             JOIN task t ON t.id = o.task_id
            WHERE o.accepter_id = ? AND o.status IN ('accepted', 'delivered')""", (BOB,)
    ).fetchall()
    expect_rows("接单方：我手上未完成的任务", rows, at_least=2,
                show=lambda r: "#%d %s[%s]" % (r[0], r[1][:8], r[2]))

    # 送达时间必须早于确认收到时间
    bad = conn.execute(
        """SELECT id FROM task_order
            WHERE finished_at IS NOT NULL AND delivered_at IS NOT NULL
              AND delivered_at > finished_at"""
    ).fetchall()
    expect_empty("不存在「确认收到早于送达」的记录", bad)

    print("\n【三】边界：不该被普通用户看到的内容确实看不到")

    expect_empty("待审核任务未出现在前台列表",
                 conn.execute("SELECT id FROM v_public_task WHERE audit_status <> 'approved'").fetchall())
    expect_empty("被驳回商品未出现在前台列表",
                 conn.execute("SELECT id FROM v_public_product WHERE audit_status = 'rejected'").fetchall())
    expect_empty("软删除预留任务未出现在前台列表",
                 conn.execute("SELECT id FROM v_public_task WHERE is_deleted = 1").fetchall())

    # 软删除是「藏起来」不是「删掉」，数据必须还在
    row = conn.execute(
        "SELECT title, deleted_by, deleted_at FROM task WHERE is_deleted = 1"
    ).fetchone()
    expect_rows("软删除的任务数据仍保留在库中", [row] if row else [],
                show=lambda r: "%s（删除人id=%s，时间=%s）" % (r[0][:8], r[1], r[2]))


def main():
    tmp_dir = tempfile.mkdtemp(prefix="campus_errand_test_")
    tmp_db = os.path.join(tmp_dir, "test.db")

    conn = sqlite3.connect(tmp_db)
    try:
        init_db.create_schema(conn)
        conn.execute("PRAGMA foreign_keys = ON")  # 关键：不开这行，外键约束形同虚设
        init_db.insert_users(conn)
        init_db.insert_demo(conn)

        print("测试库：%s" % tmp_db)
        test_constraints(conn)
        test_queries(conn)
    finally:
        conn.close()
        try:
            os.remove(tmp_db)
            os.rmdir(tmp_dir)
        except OSError:
            pass

    print("\n" + "=" * 60)
    print("结果：通过 %d 项，失败 %d 项" % (passed, failed))
    print("=" * 60)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
