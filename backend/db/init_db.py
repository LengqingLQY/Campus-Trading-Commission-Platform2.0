#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
校园跑腿交易平台 —— 数据库初始化与演示数据

用法：
    python init_db.py              # 重建数据库 + 预置账号 + 丰富演示数据
    python init_db.py --no-demo    # 只建表 + 预置账号，不插入业务演示数据
    python init_db.py --db 路径     # 指定数据库文件位置

注意：脚本会删除并重建所有表，已有数据会丢失。它适合老师演示前重置到一套
可重复的演示状态；真实部署环境不要直接运行。

演示主账号：alice / alice123，昵称为“柚子汽水”。账号保留 alice 这一登录名，
方便兼容既有测试与旧演示说明；展示给用户的昵称和联系方式均为虚构数据。

商品图片按演示清单放入 uploads/demo/ 后，初始化时会自动映射到对应商品；
跑腿任务图片当前保持为空，头像仍由独立素材映射流程处理。
"""

import argparse
import hashlib
import os
import re
import secrets
import sqlite3
import string
import sys
from datetime import datetime, timedelta


if not sys.stdout.isatty():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "app.db")

# 建表顺序的倒序，先删子表再删父表。
DROP_ORDER = [
    "comment",
    "product_order_termination_request",
    "task_termination_request",
    "product_order",
    "task_order",
    "product",
    "task",
    "user",
]
VIEWS = ["v_public_task", "v_public_product"]


# --------------------------------------------------------------------------
# 密码哈希
# --------------------------------------------------------------------------
PBKDF2_ITERATIONS = 600000  # 与 Java PasswordUtil 保持一致


def _fallback_generate_password_hash(password, salt_length=16):
    """werkzeug 未安装时的替代实现，输出 Java 端可验证的格式。"""
    alphabet = string.ascii_letters + string.digits
    salt = "".join(secrets.choice(alphabet) for _ in range(salt_length))
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()
    return "pbkdf2:sha256:%d$%s$%s" % (PBKDF2_ITERATIONS, salt, digest)


try:
    from werkzeug.security import generate_password_hash as _werkzeug_generate_password_hash

    def generate_password_hash(password, salt_length=16):
        """显式固定 PBKDF2，避免 Werkzeug 默认算法变化。"""
        return _werkzeug_generate_password_hash(
            password,
            method="pbkdf2:sha256:%d" % PBKDF2_ITERATIONS,
            salt_length=salt_length,
        )

    HASH_SOURCE = "werkzeug(pbkdf2:sha256:%d)" % PBKDF2_ITERATIONS
except ImportError:
    generate_password_hash = _fallback_generate_password_hash
    HASH_SOURCE = "hashlib(与 Java PasswordUtil 兼容)"


# --------------------------------------------------------------------------
# 预置账号
# --------------------------------------------------------------------------
# (id, account, password, username, qq, wechat, phone, avatar_url, role)
# 除 admin 外均为校园网名；联系方式是演示专用的虚构值。
PRESET_USERS = [
    (1, "admin", "admin123", "系统管理员", "", "", "", "", "admin"),
    (2, "alice", "alice123", "柚子汽水", "10002", "wx_youzi_qs", "13910001002", "", "user"),
    (3, "bob", "bob123", "北岛有风", "10003", "wx_beidao_yf", "13910001003", "", "user"),
    (4, "carol", "carol123", "七号小铺", "10004", "wx_qihao_shop", "13910001004", "", "user"),
    (5, "zaobaibukun", "demo123", "早八不困", "10005", "wx_zaobaibk", "13910001005", "", "user"),
    (6, "yunduocangjia", "demo123", "云朵收藏家", "10006", "wx_yunduo_scj", "13910001006", "", "user"),
    (7, "zhishixiaogou", "demo123", "芝士小狗", "10007", "wx_zhishi_xg", "13910001007", "", "user"),
    (8, "yueliangyoucha", "demo123", "月亮邮差", "10008", "wx_yueliang_yc", "13910001008", "", "user"),
    (9, "bingtangbujia", "demo123", "不加糖的冰", "10009", "wx_bingtang_bj", "13910001009", "", "user"),
    (10, "wanfengbianlidian", "demo123", "晚风便利店", "10010", "wx_wanfeng_bld", "13910001010", "", "user"),
    (11, "juzihai", "demo123", "橘子海", "10011", "wx_juzihai", "13910001011", "", "user"),
    (12, "nuomituantuan", "demo123", "糯米团团", "10012", "wx_nuomi_tt", "13910001012", "", "user"),
    (13, "xiaoxiongkaixiang", "demo123", "小熊开箱", "10013", "wx_xiaoxiong_kx", "13910001013", "", "user"),
    (14, "yutianshaibeizi", "demo123", "雨天晒被子", "10014", "wx_yutian_sbz", "13910001014", "", "user"),
    (15, "kelejiabing", "demo123", "可乐加冰", "10015", "wx_kele_jb", "13910001015", "", "user"),
    (16, "yikeqingmei", "demo123", "一颗青梅", "10016", "wx_yike_qm", "13910001016", "", "user"),
    (17, "bantangwulong", "demo123", "半糖乌龙", "10017", "wx_bantang_wl", "13910001017", "", "user"),
    (18, "shuibuxingdemao", "demo123", "睡不醒的猫", "10018", "wx_shuibuxing_m", "13910001018", "", "user"),
    (19, "lvdoushasha", "demo123", "绿豆沙沙", "10019", "wx_lvdou_ss", "13910001019", "", "user"),
    (20, "shanzhichuanxing", "demo123", "山止川行", "10020", "wx_shanzhi_cx", "13910001020", "", "user"),
    (21, "erjifenniyiban", "demo123", "耳机分你一半", "10021", "wx_erji_fnyb", "13910001021", "", "user"),
    (22, "luorishouxinren", "demo123", "落日收信人", "10022", "wx_luori_sxr", "13910001022", "", "user"),
]

ADMIN_ID = 1
ALICE_ID = 2  # 主控演示用户：柚子汽水
BOB_ID = 3
CAROL_ID = 4


def _ts(**kwargs):
    """生成按本地时间保存的时间文本。"""
    return (datetime.now() - timedelta(**kwargs)).strftime("%Y-%m-%d %H:%M:%S")


def _future(hours=24):
    return (datetime.now() + timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")


# 商品图片从项目根目录 uploads/demo/ 按 product-编号 文件名自动映射。
PHOTO_CATALOG = {category: [] for category in ("book", "electronic", "daily", "clothing", "sports", "other")}
TASK_PHOTOS = []
DEMO_UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "uploads", "demo"))
DEMO_IMAGE_BASE_URL = "http://localhost:8081/uploads/demo/"


def _image_pair(values, index, every=3):
    """保留旧的分类图片接口；当前商品图片由本地编号文件统一映射。"""
    if not values:
        return None
    first = values[index % len(values)]
    if index % every == 0:
        second = values[(index + 1) % len(values)]
        return "%s,%s" % (first, second)
    return first


CONTACTS = {
    row[0]: (row[4], row[5], row[6])
    for row in PRESET_USERS
}


def _contact(user_id):
    qq, wechat, phone = CONTACTS[user_id]
    return "QQ:%s · 微信:%s · 电话:%s" % (qq, wechat, phone)


def _task(
    task_id,
    publisher_id,
    title,
    description,
    pickup,
    delivery,
    days_ago,
    amount,
    status="open",
    audit_status="approved",
    audit_remark=None,
    is_deleted=0,
    deleted_by=None,
):
    created_at = _ts(days=days_ago)
    deadline = _ts(days=max(1, days_ago - 1)) if status == "completed" else _future(hours=12 + task_id % 48)
    return (
        task_id,
        publisher_id,
        title,
        description,
        pickup,
        delivery,
        deadline,
        amount,
        _contact(publisher_id),
        _image_pair(TASK_PHOTOS, task_id),
        audit_status,
        audit_remark,
        status,
        is_deleted,
        deleted_by,
        _ts(days=max(1, days_ago - 1)) if is_deleted else None,
        created_at,
    )


def build_demo_tasks():
    """覆盖公开列表、审核边界、各跑腿状态和多种校园生活场景。"""
    return [
        _task(1, ALICE_ID, "代取快递｜菜鸟驿站到宿舍", "两个小包裹，不重，晚饭前帮忙带到楼下即可。", "菜鸟驿站（东区）", "青禾公寓2号楼", 18, 5.5),
        _task(2, ALICE_ID, "南门外卖送到实验楼", "外卖已放在南门取餐柜，麻烦带到计算机实验楼 A301。", "学校南门取餐柜", "计算机实验楼 A301", 17, 7.0, status="accepted"),
        _task(3, BOB_ID, "打印课程论文并装订送宿舍", "邮箱里有 PDF，双面打印、胶装，下午课前送到宿舍。", "图书馆一楼打印室", "青禾公寓5号楼", 16, 12.0, status="completed"),
        _task(4, ALICE_ID, "校医院代取常用药", "凭取药单取一盒常用药，药费到付，比较着急。", "校医院药房", "青禾公寓2号楼", 15, 6.0, audit_status="pending"),
        _task(5, BOB_ID, "代排演唱会门票", "校外长时间排队代抢票，具体规则不清晰。", "市中心售票点", "学校北门", 14, 50.0, audit_status="rejected", audit_remark="校外代抢票不属于校园跑腿范围"),
        _task(6, CAROL_ID, "线上刷单兼职日结", "日结高薪，加联系方式详聊。", "线上", "线上", 13, 100.0, is_deleted=1, deleted_by=ADMIN_ID),
        _task(7, CAROL_ID, "图书馆占座并带份早餐", "早上八点前占到二楼靠窗位置，再顺路带一份豆浆。", "二食堂", "图书馆二楼", 12, 3.0),
        _task(8, BOB_ID, "搬运行李到南门", "两个 24 寸行李箱，东西比较重，约半小时内完成。", "青禾公寓5号楼", "学校南门", 11, 20.0),
        _task(9, ALICE_ID, "带一份三食堂糖醋排骨", "餐盒已打包，送到宿舍楼下后电话联系。", "三食堂窗口", "青禾公寓2号楼", 10, 4.0, status="delivered"),
        _task(10, ALICE_ID, "帮忙借投影笔并送到教室", "下午社团分享会要用，借到后放在教学楼 204。", "创新中心服务台", "教学楼 204", 9, 4.5),
        _task(11, BOB_ID, "图书馆还书并带回借书证", "帮忙把三本书放回还书箱，再把借书证带回宿舍。", "图书馆南门还书箱", "青禾公寓3号楼", 9, 5.0, status="accepted"),
        _task(12, CAROL_ID, "代买打印纸和中性笔", "A4 打印纸一包、黑色中性笔两支，周边文具店即可。", "校外文具店", "艺术楼一层", 8, 8.0, status="delivered"),
        _task(13, 5, "把社团物资送到礼堂", "一箱横幅和两盒彩笔，不重但体积稍大。", "社团活动室", "大礼堂后台", 8, 9.0, status="completed"),
        _task(14, 6, "代取校外快递大件", "一个纸箱，约十公斤，送到宿舍楼下即可。", "学校西门快递点", "青禾公寓6号楼", 7, 16.0, status="accepted"),
        _task(15, 7, "二食堂打包晚饭送到宿舍", "一份套餐加一杯热豆浆，六点半前送到。", "二食堂二楼", "青禾公寓7号楼", 7, 6.5, status="completed"),
        _task(16, 8, "帮忙送雨伞到教学楼", "突然下雨，送到教学楼大厅，伞可以放在值班台。", "青禾公寓8号楼", "教学楼大厅", 6, 4.0, status="delivered"),
        _task(17, 9, "代排队盖章（学生事务大厅）", "材料已经准备好，只需排队盖章并带回。", "学生事务大厅", "青禾公寓9号楼", 6, 10.0, status="completed"),
        _task(18, 10, "把资料送到南门寄出", "文件袋不要折叠，顺路帮忙在快递点寄出。", "教学楼 108", "学校南门快递点", 5, 7.5, status="accepted"),
        _task(19, 11, "代取鲜花到女生宿舍", "花束已付款，取到后轻拿轻放，晚上八点前送达。", "南门花店", "青禾公寓4号楼", 5, 9.5, status="delivered"),
        _task(20, 12, "体育馆借球并送回", "借两个篮球到体育馆门口，活动结束后再放回原处。", "体育馆器材室", "体育馆篮球场", 4, 5.5, status="completed"),
        _task(21, 13, "代打印装订实验报告", "黑白双面打印 30 页，左侧胶装，下午三点前交。", "图书馆打印室", "理工楼 B204", 4, 11.0, status="accepted"),
        _task(22, 14, "帮忙带早餐到考场", "一份饭团和热牛奶，七点四十前放到考场门口。", "东门早餐摊", "教学楼 307", 3, 5.0, status="completed"),
        _task(23, 15, "代买防晒和纸巾", "防晒霜小样一支、抽纸两包，便利店有就可以。", "校园便利店", "青禾公寓8号楼", 3, 6.0, status="delivered"),
        _task(24, 16, "送忘带的门禁卡", "门禁卡落在宿舍，帮忙送到图书馆门口。", "青禾公寓10号楼", "图书馆北门", 3, 3.5, status="completed"),
        _task(25, 17, "取校外维修好的耳机", "维修店已经通知取件，盒子不大，帮忙带回宿舍。", "校外数码城", "青禾公寓11号楼", 2, 10.0, status="accepted"),
        _task(26, 18, "帮忙领社团服装", "统一领取三件社团服，按姓名装袋后送到活动室。", "大学生活动中心", "社团活动室", 2, 7.0, status="delivered"),
        _task(27, 19, "代取外卖（晚高峰）", "订单号已备注，放到宿舍楼下即可，不用上楼。", "学校北门外卖柜", "青禾公寓12号楼", 2, 4.5, status="completed"),
        _task(28, 20, "帮忙送一把折叠伞", "天气预报有雨，送到西区教学楼门卫处。", "青禾公寓13号楼", "西区教学楼门卫", 1, 4.0, status="accepted"),
        _task(29, 21, "代收同学寄来的教材", "快递柜取出后放到宿舍楼下，纸箱不要拆。", "菜鸟驿站（西区）", "青禾公寓14号楼", 1, 6.0, status="completed"),
        _task(30, ALICE_ID, "代寄快递到校外服务点", "一个文件袋，帮忙带到校外寄件点并拍下单号。", "青禾公寓2号楼", "学校西门寄件点", 1, 8.0),
        _task(31, 22, "代买早餐豆浆油条", "一根油条、一杯豆浆，七点半前放到楼下。", "东门早餐摊", "青禾公寓15号楼", 1, 4.0),
        _task(32, BOB_ID, "帮忙取打印好的海报", "四张 A2 海报，卷好后带到社团活动室。", "校外打印店", "大学生活动中心", 1, 8.0),
        _task(33, CAROL_ID, "代送失物到保卫处", "捡到一串钥匙，想请同学帮忙送到保卫处登记。", "青禾公寓7号楼", "东门保卫处", 2, 3.0, audit_status="pending"),
        _task(34, 5, "线上刷单兼职", "承诺高额返现并要求先付款。", "线上", "线上", 2, 80.0, audit_status="rejected", audit_remark="疑似高风险兼职信息"),
        _task(35, 6, "搬宿舍书箱到新楼", "四个书箱，电梯直达，希望找一位力气大些的同学。", "青禾公寓6号楼", "青禾公寓16号楼", 2, 18.0),
        _task(36, 7, "代取社团奖杯", "活动结束后把奖杯从礼堂带回社团室，注意防碰撞。", "大礼堂后台", "社团活动室", 3, 6.0),
        _task(37, 8, "帮忙送文件到创新中心", "项目申报书一份，不能折叠，下午五点前送到。", "理工楼 A208", "创新中心前台", 3, 5.5),
        _task(38, 9, "代买生日蛋糕", "六寸水果蛋糕，卡片文字已发，晚上七点前取到。", "南门蛋糕店", "青禾公寓9号楼", 3, 12.0),
        _task(39, 10, "取洗衣店的被子", "被子已洗好并打包，体积较大，送到宿舍楼下。", "校园洗衣房", "青禾公寓10号楼", 4, 10.0),
        _task(40, 11, "帮忙排队办理校园卡", "只需取号排队，轮到后通知我过去办理。", "学生事务大厅", "学生事务大厅", 4, 5.0),
        _task(41, 12, "代取毕业证材料", "材料已在学院办公室，带回宿舍即可。", "学院办公室", "青禾公寓12号楼", 4, 6.0),
        _task(42, 13, "送雨衣到南门", "下课突然下雨，送一件轻便雨衣到南门。", "青禾公寓13号楼", "学校南门", 5, 5.0),
        _task(43, 14, "从打印店带图纸回实验室", "建筑图纸三张，卷筒装，不要压折。", "校外打印店", "理工楼 C301", 5, 9.0),
        _task(44, 15, "代买实验耗材", "手套、标签纸和记号笔各一份，按清单购买。", "校园便利店", "实验楼一层", 6, 7.0),
        _task(45, 16, "帮忙取快递柜大件", "一个宿舍收纳架，包装略大，帮忙送到楼下。", "菜鸟驿站（东区）", "青禾公寓10号楼", 6, 13.0),
        _task(46, 17, "代送琴谱到艺术楼", "琴谱文件夹一份，送到艺术楼琴房门口。", "青禾公寓11号楼", "艺术楼 203", 7, 5.0),
        _task(47, 18, "帮忙把书还到图书馆", "四本书已装袋，放回图书馆还书箱即可。", "青禾公寓12号楼", "图书馆南门", 7, 6.0),
        _task(48, 19, "代取二食堂餐盒", "餐盒打包好了，送到宿舍楼下，不需要上楼。", "二食堂一楼", "青禾公寓13号楼", 8, 4.0),
        _task(49, 20, "帮忙送衣物到洗衣房", "一袋衣物，帮忙送到校园洗衣房并拍照确认。", "青禾公寓14号楼", "校园洗衣房", 8, 5.5),
        _task(50, 21, "代买便利店夜宵", "一桶泡面、酸奶和一包纸巾，晚上十点前送到。", "校园便利店", "青禾公寓15号楼", 9, 6.5),
        _task(51, 22, "帮忙取校园卡套", "卡套已在文具店预留，帮忙拿到图书馆门口。", "校外文具店", "图书馆北门", 10, 4.0),
        _task(52, ALICE_ID, "代买一杯无糖冰美式", "下午自习前想喝咖啡，冰美式不加糖，送到图书馆。", "南门咖啡店", "图书馆一楼", 10, 5.0),
        _task(53, 6, "代买来路不明的药品", "无法提供处方或购买凭证。", "校外", "校园内", 11, 30.0, audit_status="pending"),
        _task(54, 7, "代购烟酒", "校外烟酒代购信息。", "校外", "校园内", 11, 40.0, audit_status="rejected", audit_remark="不符合校园平台服务范围"),
    ]


def _product(
    product_id,
    seller_id,
    title,
    description,
    category,
    condition,
    price,
    location,
    days_ago,
    status="on_sale",
    audit_status="approved",
    audit_remark=None,
    is_deleted=0,
    deleted_by=None,
):
    created_at = _ts(days=days_ago)
    return (
        product_id,
        seller_id,
        title,
        description,
        category,
        condition,
        price,
        location,
        _contact(seller_id),
        _image_pair(PHOTO_CATALOG[category], product_id),
        audit_status,
        audit_remark,
        status,
        is_deleted,
        deleted_by,
        _ts(days=max(1, days_ago - 1)) if is_deleted else None,
        created_at,
    )


def build_demo_products():
    """覆盖六类商品、不同成色、成交状态与审核/软删除边界。"""
    return [
        _product(1, ALICE_ID, "考研数学复习全书", "只做了前三章，其余全新，无笔记无划线。", "book", "almost_new", 35.0, "青禾公寓2号楼下", 18),
        _product(2, BOB_ID, "罗技无线鼠标 M170", "用了半年，功能完好，送一节新电池。", "electronic", "good", 45.0, "计算机实验楼门口", 17, status="sold"),
        _product(3, CAROL_ID, "宿舍护眼小台灯", "USB 供电，三档亮度，搬宿舍后用不上了。", "daily", "good", 15.0, "青禾公寓7号楼下", 16),
        _product(4, ALICE_ID, "茅台酒瓶与礼盒包装", "仅转让空酒瓶和礼盒包装，瓶身与外盒保存较好，适合收藏展示或拍摄道具，不含酒水。", "other", "good", 35.0, "青禾公寓2号楼下", 15, audit_status="rejected", audit_remark="商品内容需补充实物与空瓶状态说明"),
        _product(5, BOB_ID, "斯伯丁篮球", "打过几次，气足，室外场耐磨款。", "sports", "good", 60.0, "体育馆篮球场", 14),
        _product(6, CAROL_ID, "冬季加厚外套", "买大了一码，仅试穿过一次，吊牌仍在，L 码，适合秋冬通勤。", "clothing", "almost_new", 80.0, "青禾公寓7号楼下", 13),
        _product(7, ALICE_ID, "雅思剑桥真题册（几乎全新）", "剑桥 12-17，部分答案做过，适合备考同学。", "book", "almost_new", 48.0, "图书馆一楼", 12, status="completed"),
        _product(8, ALICE_ID, "考研政治重点笔记", "自己整理的电子打印版，附思维导图和背诵清单。", "book", "good", 22.0, "青禾公寓2号楼", 11),
        _product(9, BOB_ID, "M1128 机械键盘", "红轴，键帽干净，带原装数据线。", "electronic", "good", 89.0, "理工楼一层", 10, status="sold"),
        _product(10, CAROL_ID, "宿舍折叠收纳箱", "两个一组，带盖，适合床下收纳。", "daily", "almost_new", 26.0, "青禾公寓7号楼", 9, status="completed"),
        _product(11, ALICE_ID, "便携榨汁杯", "充电后可以打果汁，容量 350ml，清洗方便。", "daily", "good", 32.0, "青禾公寓2号楼", 8),
        _product(12, 5, "Kindle Paperwhite 电子书阅读器", "屏幕无划痕，电池状态好，送保护套。", "electronic", "good", 260.0, "图书馆北门", 8, status="sold"),
        _product(13, ALICE_ID, "小米蓝牙音箱", "音质正常，适合宿舍或社团活动使用。", "electronic", "good", 55.0, "创新中心前台", 7, status="sold"),
        _product(14, 6, "公路车头盔", "M 码，轻微使用痕迹，安全扣完好。", "sports", "good", 75.0, "体育馆门口", 7, status="completed"),
        _product(15, 7, "桌面绿植组合", "两盆小绿植加一个陶瓷花盆，适合书桌。", "daily", "almost_new", 28.0, "青禾公寓8号楼", 6),
        _product(16, ALICE_ID, "米白针织开衫", "春秋季外搭，M 码，试穿两次。", "clothing", "almost_new", 42.0, "青禾公寓2号楼", 6),
        _product(17, 8, "复古胶片相机", "机身状态正常，适合入门体验，送一卷胶卷。", "electronic", "good", 180.0, "艺术楼前", 5, status="completed"),
        _product(18, 9, "轻薄羽绒马甲", "深灰色，L 码，秋冬叠穿很方便。", "clothing", "almost_new", 65.0, "青禾公寓9号楼", 5, status="sold"),
        _product(19, 10, "宿舍落地衣架", "可折叠，搬宿舍后闲置，配件齐全。", "daily", "good", 35.0, "青禾公寓10号楼", 4, status="sold"),
        _product(20, 11, "入门羽毛球拍一对", "两支球拍加三只训练球，适合周末运动。", "sports", "good", 58.0, "体育馆器材室", 4, status="completed"),
        _product(21, 12, "桌面小风扇", "三档风速，USB 供电，声音很轻。", "daily", "almost_new", 18.0, "青禾公寓12号楼", 3),
        _product(22, 13, "计算器与尺子套装", "考试可用的科学计算器，附透明笔袋。", "book", "good", 30.0, "教学楼 307", 3, status="sold"),
        _product(23, 14, "手冲咖啡壶", "玻璃壶身，容量 600ml，送滤纸一包。", "daily", "almost_new", 39.0, "南门咖啡店旁", 3, status="completed"),
        _product(24, 15, "运动腰包", "跑步用轻便腰包，可放手机和钥匙。", "sports", "almost_new", 20.0, "体育馆门口", 2, status="sold"),
        _product(25, 16, "动漫周边盲盒", "买来发现是重复款，外盒完整未拆，适合收藏或交换，按单盒低价转让。", "other", "almost_new", 25.0, "青禾公寓10号楼", 2),
        _product(26, 17, "线性代数教材", "课程指定教材，有少量重点标注。", "book", "good", 24.0, "图书馆一楼", 2, status="completed"),
        _product(27, 18, "降噪耳机", "通勤和自习都能用，耳罩无明显磨损。", "electronic", "good", 120.0, "理工楼 A208", 1, status="sold"),
        _product(28, 19, "宿舍床帘", "蓝灰色，适配常见上铺尺寸，配挂钩。", "daily", "almost_new", 45.0, "青禾公寓12号楼", 1, status="sold"),
        _product(29, 20, "瑜伽垫", "10mm 加厚，防滑效果好，适合宿舍拉伸。", "sports", "good", 36.0, "体育馆东门", 1, status="completed"),
        _product(30, 21, "迷你投影仪", "宿舍看电影使用，支持 HDMI 和 U 盘。", "electronic", "good", 210.0, "创新中心前台", 1),
        _product(31, 22, "桌面加湿器", "静音小型加湿器，带氛围灯和备用棉棒。", "daily", "almost_new", 29.0, "青禾公寓15号楼", 1, status="sold"),
        _product(32, BOB_ID, "日系帆布包", "容量大，课本和电脑都能装，肩带结实。", "clothing", "good", 32.0, "学校北门", 2, status="completed"),
        _product(33, CAROL_ID, "猫猫抱枕", "柔软不掉毛，宿舍午休可以当靠枕。", "daily", "almost_new", 20.0, "青禾公寓7号楼", 2),
        _product(34, 5, "校园纪念明信片", "购入后一直保存未使用，六张校园风景明信片成色完整，适合收藏或寄给朋友。", "other", "almost_new", 12.0, "图书馆文创店", 3),
        _product(35, 6, "电子词典", "词库齐全，按键灵敏，适合考研和四六级。", "electronic", "good", 70.0, "教学楼大厅", 3, status="sold"),
        _product(36, 7, "小米手环", "功能正常，表带有轻微使用痕迹。", "electronic", "good", 45.0, "青禾公寓8号楼", 4, status="completed"),
        _product(37, 8, "保温饭盒", "容量 1L，密封性好，适合带饭。", "daily", "almost_new", 28.0, "青禾公寓8号楼", 4),
        _product(38, 9, "折叠自行车锁", "钢缆锁，轻便易携，钥匙两把。", "sports", "good", 26.0, "学校西门", 5, status="sold"),
        _product(39, 10, "素描本和马克笔", "素描本两本、马克笔一盒，适合设计作业。", "book", "good", 42.0, "艺术楼 203", 5),
        _product(40, 11, "羽绒服收纳袋", "买多后闲置，三只收纳袋未使用，包装有轻微压痕，附手动抽气泵。", "daily", "almost_new", 18.0, "青禾公寓9号楼", 6, status="completed"),
        _product(41, 12, "蓝牙键盘", "薄款静音键盘，适合平板和笔记本。", "electronic", "almost_new", 55.0, "理工楼 C301", 6),
        _product(42, 13, "篮球护腕", "买多的一对篮球护腕，仅试戴过一次，弹性正常，无明显污渍。", "sports", "almost_new", 16.0, "体育馆篮球场", 7, status="sold"),
        _product(43, 14, "床头阅读灯", "暖光三档亮度，夹式设计，不占桌面。", "daily", "good", 25.0, "青禾公寓10号楼", 7),
        _product(44, 15, "旅行收纳袋", "四件套，适合假期出行整理衣物。", "daily", "almost_new", 30.0, "青禾公寓11号楼", 8, is_deleted=1, deleted_by=15),
        _product(45, 16, "护肤小样套装", "整理化妆包时闲置的旅行装护肤小样，部分试用过，剩余量以实物为准，瓶身无明显破损。", "other", "good", 80.0, "校外", 8, audit_status="rejected", audit_remark="商品来源和保质期信息仍需补充"),
        _product(46, 17, "二手单反镜头", "闲置单反镜头，镜片无明显霉斑，外观有轻微使用痕迹，功能可当面确认，附前后盖。", "electronic", "good", 600.0, "艺术楼前", 9, audit_status="pending"),
        _product(47, 18, "吉他变调夹", "金属夹，适合民谣吉他，几乎没用过。", "sports", "almost_new", 15.0, "艺术楼琴房", 9),
        _product(48, 19, "小型电煮锅", "一人份电煮锅，适合煮面和小火锅。", "daily", "good", 58.0, "青禾公寓13号楼", 10, status="sold"),
        _product(49, 20, "帆布鞋", "白色 39 码，鞋底干净，适合日常穿。", "clothing", "good", 35.0, "青禾公寓14号楼", 10),
        _product(50, 21, "小号行李箱", "20 寸，轮子顺滑，适合周末短途。", "clothing", "good", 75.0, "学校南门", 11, status="completed"),
        _product(51, 22, "数据线收纳盒", "整理桌面时闲置的理线盒，盒体完好，附三条短数据线，适合宿舍桌面收纳。", "electronic", "good", 18.0, "青禾公寓15号楼", 11),
        _product(52, ALICE_ID, "日常手账贴纸包", "买多后闲置的校园生活主题贴纸，未大面积使用，边角保存完整，适合手账和笔记装饰。", "book", "almost_new", 9.9, "图书馆文创店", 12),
        _product(53, ALICE_ID, "毕业季西装外套", "仅试穿，尺码偏大，适合毕业照或答辩。", "clothing", "almost_new", 88.0, "青禾公寓2号楼", 12, audit_status="pending"),
        _product(54, 5, "闲置礼盒杂货组合", "整理闲置物品时打包的一组礼盒和日常小物，部分未拆封，按图片整体转让，不接受拆售。", "other", "good", 45.0, "青禾公寓5号楼", 13, audit_status="rejected", audit_remark="商品内容混杂，需补充具体物品清单"),
    ]


def apply_local_product_images(conn):
    """把 uploads/demo 中按 product-编号 命名的图片写入商品表。"""
    if not os.path.isdir(DEMO_UPLOAD_DIR):
        return

    filenames = os.listdir(DEMO_UPLOAD_DIR)
    for product_id in range(1, 55):
        base = "product-%03d" % product_id
        matched = [
            name
            for name in filenames
            if re.fullmatch(r"%s(?:-\d{2})?\.(?:jpg|jpeg|png)" % base, name, re.IGNORECASE)
        ]

        def image_order(name):
            stem = os.path.splitext(name)[0]
            return 1 if stem == base else int(stem.rsplit("-", 1)[1])

        matched.sort(key=image_order)
        image_urls = [DEMO_IMAGE_BASE_URL + name for name in matched]
        conn.execute(
            "UPDATE product SET image_urls = ? WHERE id = ?",
            (",".join(image_urls) if image_urls else None, product_id),
        )


def _task_order(order_id, task_id, publisher_id, accepter_id, status, days_ago):
    created = _ts(days=days_ago)
    delivered = _ts(days=max(1, days_ago - 1)) if status in ("delivered", "completed") else None
    finished = _ts(days=max(1, days_ago - 2)) if status == "completed" else None
    return (order_id, task_id, publisher_id, accepter_id, status, created, delivered, finished)


def _product_order(order_id, product_id, seller_id, buyer_id, price, status, days_ago):
    created = _ts(days=days_ago)
    delivered = _ts(days=max(1, days_ago - 1)) if status in ("delivered", "completed") else None
    finished = _ts(days=max(1, days_ago - 2)) if status == "completed" else None
    cancelled = _ts(days=max(1, days_ago - 1)) if status == "cancelled" else None
    return (order_id, product_id, seller_id, buyer_id, price, status, created, delivered, finished, cancelled)


def build_demo_task_orders():
    return [
        _task_order(1, 2, ALICE_ID, BOB_ID, "accepted", 16),
        _task_order(2, 3, BOB_ID, ALICE_ID, "completed", 15),
        _task_order(3, 9, ALICE_ID, BOB_ID, "delivered", 9),
        _task_order(4, 11, BOB_ID, ALICE_ID, "accepted", 8),
        _task_order(5, 12, CAROL_ID, ALICE_ID, "delivered", 7),
        _task_order(6, 13, 5, ALICE_ID, "completed", 7),
        _task_order(7, 14, 6, 7, "accepted", 6),
        _task_order(8, 15, 7, 8, "completed", 6),
        _task_order(9, 16, 8, 9, "delivered", 5),
        _task_order(10, 17, 9, 10, "completed", 5),
        _task_order(11, 18, 10, 11, "accepted", 4),
        _task_order(12, 19, 11, 12, "delivered", 4),
        _task_order(13, 20, 12, 13, "completed", 3),
        _task_order(14, 21, 13, 14, "accepted", 3),
        _task_order(15, 22, 14, 15, "completed", 3),
        _task_order(16, 23, 15, 16, "delivered", 2),
        _task_order(17, 24, 16, 17, "completed", 2),
        _task_order(18, 25, 17, 18, "accepted", 1),
        _task_order(19, 26, 18, 19, "delivered", 1),
        _task_order(20, 27, 19, 20, "completed", 1),
        _task_order(21, 28, 20, 21, "accepted", 1),
        _task_order(22, 29, 21, ALICE_ID, "completed", 1),
        _task_order(23, 31, 22, ALICE_ID, "cancelled", 3),
    ]


def build_demo_product_orders():
    return [
        _product_order(1, 2, BOB_ID, ALICE_ID, 45.0, "created", 16),
        _product_order(2, 7, ALICE_ID, 5, 48.0, "completed", 12),
        _product_order(3, 9, BOB_ID, ALICE_ID, 89.0, "delivered", 9),
        _product_order(4, 10, CAROL_ID, ALICE_ID, 26.0, "completed", 8),
        _product_order(5, 12, 5, ALICE_ID, 260.0, "created", 7),
        _product_order(6, 13, ALICE_ID, 6, 55.0, "delivered", 6),
        _product_order(7, 14, 6, 7, 75.0, "completed", 6),
        _product_order(8, 15, 7, 8, 28.0, "cancelled", 5),
        _product_order(9, 16, ALICE_ID, 8, 42.0, "cancelled", 5),
        _product_order(10, 17, 8, ALICE_ID, 180.0, "completed", 4),
        _product_order(11, 18, 9, 10, 65.0, "created", 4),
        _product_order(12, 19, 10, 11, 35.0, "delivered", 4),
        _product_order(13, 20, 11, 12, 58.0, "completed", 3),
        _product_order(14, 21, 12, 13, 18.0, "cancelled", 3),
        _product_order(15, 22, 13, 14, 30.0, "created", 3),
        _product_order(16, 23, 14, 15, 39.0, "completed", 3),
        _product_order(17, 24, 15, 16, 20.0, "delivered", 2),
        _product_order(18, 25, 16, 17, 25.0, "cancelled", 2),
        _product_order(19, 26, 17, 18, 24.0, "completed", 2),
        _product_order(20, 27, 18, 19, 120.0, "created", 1),
        _product_order(21, 28, 19, 20, 45.0, "delivered", 1),
        _product_order(22, 29, 20, 21, 36.0, "completed", 1),
        _product_order(23, 31, 22, ALICE_ID, 29.0, "created", 1),
        _product_order(24, 32, BOB_ID, CAROL_ID, 32.0, "completed", 2),
        _product_order(25, 35, 6, 7, 70.0, "delivered", 2),
        _product_order(26, 36, 7, 8, 45.0, "completed", 3),
        _product_order(27, 38, 9, 10, 26.0, "created", 3),
        _product_order(28, 40, 11, 12, 18.0, "completed", 4),
        _product_order(29, 42, 13, 14, 16.0, "delivered", 5),
        _product_order(30, 48, 19, 20, 58.0, "created", 6),
        _product_order(31, 50, 21, 22, 75.0, "completed", 7),
    ]


def build_demo_termination_requests():
    product_requests = [
        (1, 1, ALICE_ID, "临时需要调整取货时间，想先和卖家协商。", "pending", None, _ts(days=2), None),
        (2, 3, BOB_ID, "买家临时无法在校内面交，申请改约或终止。", "pending", None, _ts(days=1), None),
        (3, 8, 7, "已经找到更合适的同款，双方协商取消。", "approved", 8, _ts(days=6), _ts(days=3)),
        (4, 9, ALICE_ID, "买家临时改变计划，申请取消订单。", "withdrawn", None, _ts(days=4), _ts(days=2)),
    ]
    task_requests = [
        (1, 2, ALICE_ID, "临时需要调整时间，先申请终止再重新发布。", "pending", None, _ts(days=2), None),
        (2, 11, BOB_ID, "借书证已经自行找回，申请结束本次跑腿。", "pending", None, _ts(days=1), None),
        (3, 9, BOB_ID, "发布者临时有事，双方协商结束任务。", "rejected", ALICE_ID, _ts(days=5), _ts(days=3)),
        (4, 31, 22, "早餐时间已过，任务不再需要。", "approved", ALICE_ID, _ts(days=6), _ts(days=4)),
    ]
    return product_requests, task_requests


PRODUCT_COMMENT_TEXTS = [
    "图片和描述很一致，想问下校内面交方便吗？",
    "价格挺合适的，卖家回复也很快。",
    "看起来保存得不错，正好是我需要的型号。",
    "已经顺利自提，沟通很顺畅，给个好评～",
    "请问还可以再补充一张细节图吗？",
    "感谢分享，等有空来看看实物。",
]

TASK_COMMENT_TEXTS = [
    "这个取送地点写得很清楚，刚好有人顺路。",
    "如果下雨建议带个袋子，祝顺利完成～",
    "时间点刚好，已经帮你转发给同学了。",
    "同校互助，支持一下，希望很快有人接单。",
    "请问可以改成楼下交接吗？",
    "已经完成啦，沟通很顺畅，辛苦发布者。",
]


def _comments_for(resource_type, resource_id, count, next_id):
    texts = PRODUCT_COMMENT_TEXTS if resource_type == "product" else TASK_COMMENT_TEXTS
    authors = [ALICE_ID, BOB_ID, CAROL_ID, 5, 6, 7, 8, 9]
    rows = []
    parent_id = next_id
    for index in range(count):
        comment_id = next_id + index
        reply_to_id = parent_id if index in (1, 4, 7, 10) else None
        author_id = authors[(resource_id + index) % len(authors)]
        is_deleted = 1 if resource_type == "product" and resource_id == 1 and index == 0 else 0
        rows.append(
            (
                comment_id,
                resource_type,
                resource_id,
                author_id,
                reply_to_id,
                texts[index % len(texts)],
                is_deleted,
                author_id if is_deleted else None,
                _ts(days=max(1, 20 - index), hours=index % 4) if is_deleted else None,
                _ts(days=max(1, 20 - index), hours=index % 4),
            )
        )
    return rows


def build_demo_comments():
    """为热门内容准备多页评论，并保留一个「原评论已删除」的回复场景。"""
    rows = []
    next_id = 1
    resources = [
        ("product", 1, 12), ("product", 2, 8), ("product", 3, 7),
        ("product", 5, 6), ("product", 6, 6), ("product", 7, 8),
        ("product", 8, 6), ("product", 9, 7), ("product", 10, 6),
        ("product", 11, 6), ("product", 12, 6), ("product", 13, 7),
        ("product", 14, 6), ("product", 17, 6), ("product", 20, 6),
        ("product", 23, 6), ("product", 27, 7), ("product", 30, 6),
        ("product", 31, 6), ("product", 35, 6), ("product", 42, 6),
        ("product", 48, 6), ("product", 52, 6),
        ("task", 1, 12), ("task", 2, 9), ("task", 3, 7),
        ("task", 7, 6), ("task", 8, 6), ("task", 9, 8),
        ("task", 10, 6), ("task", 11, 7), ("task", 12, 6),
        ("task", 13, 6), ("task", 14, 6), ("task", 15, 6),
        ("task", 16, 6), ("task", 19, 6), ("task", 20, 6),
        ("task", 21, 6), ("task", 22, 6), ("task", 23, 6),
        ("task", 24, 6), ("task", 27, 6), ("task", 30, 7),
        ("task", 31, 6), ("task", 32, 6), ("task", 35, 6),
        ("task", 38, 6), ("task", 42, 6), ("task", 47, 6),
        ("task", 50, 6), ("task", 52, 6),
    ]
    for resource_type, resource_id, count in resources:
        batch = _comments_for(resource_type, resource_id, count, next_id)
        rows.extend(batch)
        next_id += len(batch)
    return rows


# --------------------------------------------------------------------------
# 建库与写入
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
        (user_id, account, generate_password_hash(password), username, qq, wechat, phone, avatar_url, role)
        for user_id, account, password, username, qq, wechat, phone, avatar_url, role in PRESET_USERS
    ]
    conn.executemany(
        """INSERT INTO user
           (id, account, password_hash, username, qq, wechat, phone, avatar_url, role)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        rows,
    )
    conn.commit()


def insert_demo(conn):
    conn.executemany(
        """INSERT INTO task
           (id, publisher_id, title, description, pickup, delivery, deadline, amount,
            contact, image_urls, audit_status, audit_remark, status, is_deleted,
            deleted_by, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [row + (row[-1],) for row in build_demo_tasks()],
    )

    conn.executemany(
        """INSERT INTO product
           (id, seller_id, title, description, category, condition, price, location,
            contact, image_urls, audit_status, audit_remark, status, is_deleted,
            deleted_by, deleted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [row + (row[-1],) for row in build_demo_products()],
    )
    apply_local_product_images(conn)

    conn.executemany(
        """INSERT INTO task_order
           (id, task_id, publisher_id, accepter_id, status, created_at, delivered_at, finished_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        build_demo_task_orders(),
    )

    conn.executemany(
        """INSERT INTO product_order
           (id, product_id, seller_id, buyer_id, price, status, created_at,
            delivered_at, finished_at, cancelled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        build_demo_product_orders(),
    )

    product_requests, task_requests = build_demo_termination_requests()
    conn.executemany(
        """INSERT INTO product_order_termination_request
           (id, order_id, requester_id, reason, status, responder_id, created_at, resolved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        product_requests,
    )
    conn.executemany(
        """INSERT INTO task_termination_request
           (id, task_id, requester_id, reason, status, responder_id, created_at, resolved_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        task_requests,
    )

    conn.executemany(
        """INSERT INTO comment
           (id, resource_type, resource_id, author_id, reply_to_id, content,
            is_deleted, deleted_by, deleted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        build_demo_comments(),
    )
    conn.commit()


def print_summary(conn, db_path, with_demo):
    print("\n数据库已生成：%s" % db_path)
    print("密码哈希来源：%s" % HASH_SOURCE)
    print("\n主控演示账号：alice / alice123（昵称：柚子汽水，普通用户）")
    print("其他普通用户账号密码：账号见用户表，密码统一为 demo123（alice/bob/carol 保留各自旧密码）")

    counts = [
        ("user", "用户"),
        ("task", "跑腿任务"),
        ("product", "二手商品"),
        ("task_order", "跑腿记录"),
        ("product_order", "购买记录"),
        ("task_termination_request", "跑腿终止申请"),
        ("product_order_termination_request", "商品终止申请"),
        ("comment", "评论/回复"),
    ]
    print("\n各表数据量：")
    for table, label in counts:
        n = conn.execute("SELECT COUNT(*) FROM %s" % table).fetchone()[0]
        print("  %-28s %-10s %d 条" % (table, label, n))

    if with_demo:
        n_task = conn.execute("SELECT COUNT(*) FROM v_public_task").fetchone()[0]
        n_product = conn.execute("SELECT COUNT(*) FROM v_public_product").fetchone()[0]
        print("\n普通用户可见：任务 %d 条，商品 %d 条" % (n_task, n_product))
        print("主账号已覆盖：发布/接取跑腿、发布/购买商品、进行中与已完成订单、评论回复、资料头像与终止申请")


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
