-- ============================================================================
--  校园跑腿交易平台 —— 数据库建表脚本
--  数据库：SQLite 3
--  版本：v1.1（对应需求分析 v1.2 普通用户端第一阶段）
--
--  设计要点：
--   1. audit_status（审核可见性）与 status（业务进度）拆成两个字段，
--      分别对应需求文档 §4 和 §6 两套状态描述，互不干扰。
--   2. 管理员审核、删除等能力当前延期；相关字段保留，为后续模块兼容。
--      当前用户接口创建内容时必须显式写入 audit_status='approved'。
--   3. 重复接取、自接取、自购买三条业务规则由数据库约束兜底，
--      后端逻辑写漏也不会产生脏数据。
--   4. 所有时间统一为 'YYYY-MM-DD HH:MM:SS' 文本，按字典序排即按时间排。
--
--  注意：SQLite 外键默认关闭，后端每次建立连接都要执行 PRAGMA foreign_keys = ON，
--       否则下面所有 REFERENCES 都不生效。
-- ============================================================================

PRAGMA foreign_keys = ON;


-- ============================ 1. 用户表 ============================
-- 普通用户注册产生；admin 账号虽由 init_db.py 兼容预置，但当前管理员功能延期。
CREATE TABLE IF NOT EXISTS user (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    account       TEXT    NOT NULL UNIQUE,              -- 登录账号，不可重复（P0-01）
    password_hash TEXT    NOT NULL,                     -- 只存哈希，禁止明文（P0-05）
    username      TEXT    NOT NULL,                     -- 昵称，可修改（P0-03）
    qq            TEXT,                                 -- 允许为空，不做格式校验
    wechat        TEXT,
    phone         TEXT,
    avatar_url    TEXT,                                 -- 头像 URL（增量契约：图片功能 §2）
    role          TEXT    NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin')),
    status        TEXT    NOT NULL DEFAULT 'active'     -- 预留：后续做封禁
                          CHECK (status IN ('active', 'banned')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);


-- ============================ 2. 跑腿任务表 ============================
CREATE TABLE IF NOT EXISTS task (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    publisher_id  INTEGER NOT NULL REFERENCES user(id),
    title         TEXT    NOT NULL,                     -- 关键词检索字段之一
    description   TEXT    NOT NULL DEFAULT '',          -- 任务说明，关键词检索字段之一
    pickup        TEXT    NOT NULL,                     -- 取件地点
    delivery      TEXT    NOT NULL,                     -- 送达地点
    deadline      TEXT,                                 -- 截止时间 'YYYY-MM-DD HH:MM:SS'
    amount        REAL    NOT NULL DEFAULT 0            -- 跑腿费（元），仅记录，不接支付
                          CHECK (amount >= 0),
    contact       TEXT    NOT NULL DEFAULT '',          -- 联系方式/备注，纯文本
    image_urls    TEXT,                                 -- 逗号分隔的图片 URL（增量契约：图片功能 §2）

    -- 审核维度：控制普通用户能否看到；当前用户接口显式写 approved，后续管理员模块再操作
    audit_status  TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (audit_status IN ('pending', 'approved', 'rejected')),
    audit_remark  TEXT,                                 -- 驳回理由

    -- 业务维度：这一单走到哪一步（发布者/接单者操作）
    -- in_progress、delivered 第一周不用，先占位，第二三周要加不必改表
    status        TEXT    NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'accepted', 'in_progress', 'delivered', 'completed')),

    -- 软删除：后续管理员删除违规任务时使用；当前接口固定为 0，数据保留
    is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    deleted_by    INTEGER REFERENCES user(id),
    deleted_at    TEXT,

    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);


-- ============================ 3. 二手商品表 ============================
CREATE TABLE IF NOT EXISTS product (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id     INTEGER NOT NULL REFERENCES user(id),
    title         TEXT    NOT NULL,                     -- 关键词检索字段之一
    description   TEXT    NOT NULL DEFAULT '',          -- 商品描述，关键词检索字段之一
    category      TEXT    NOT NULL DEFAULT 'other'      -- 分类，前端下拉框照此取值
                          CHECK (category IN ('book', 'electronic', 'daily', 'clothing', 'sports', 'other')),
    condition     TEXT    NOT NULL DEFAULT 'good'       -- 成色
                          CHECK (condition IN ('new', 'almost_new', 'good', 'fair')),
    price         REAL    NOT NULL DEFAULT 0            -- 价格（元），仅记录，不接支付
                          CHECK (price >= 0),
    location      TEXT    NOT NULL DEFAULT '',          -- 交易地点
    contact       TEXT    NOT NULL DEFAULT '',
    image_urls    TEXT,                                 -- 逗号分隔的图片 URL（增量契约：图片功能 §2）

    -- 当前用户接口显式写 approved；pending/rejected 为后续审核模块预留
    audit_status  TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (audit_status IN ('pending', 'approved', 'rejected')),
    audit_remark  TEXT,

    -- completed 第一周不用，预留
    status        TEXT    NOT NULL DEFAULT 'on_sale'
                          CHECK (status IN ('on_sale', 'sold', 'completed')),

    -- 当前接口固定为 0；后续下架/软删除模块使用
    is_deleted    INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
    deleted_by    INTEGER REFERENCES user(id),
    deleted_at    TEXT,

    created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);


-- ============================ 4. 跑腿记录表 ============================
-- 谁接了哪条任务，个人空间「我接取的任务」由此表查出
-- 完成需要双方确认：接单方标记送达 -> 发布者确认收到，才算 completed
-- 终止申请同意后 task_order 变 cancelled、task 回到 open，可再次被接取，
-- 故 task_id 不再用列级 UNIQUE，改为下方「仅非 cancelled 唯一」的部分索引。
CREATE TABLE IF NOT EXISTS task_order (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL REFERENCES task(id),
    publisher_id INTEGER NOT NULL REFERENCES user(id),         -- 冗余存一份，个人空间查询免 JOIN
    accepter_id  INTEGER NOT NULL REFERENCES user(id),
    status       TEXT    NOT NULL DEFAULT 'accepted'
                         CHECK (status IN ('accepted', 'delivered', 'completed', 'cancelled')),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    delivered_at TEXT,                                          -- 接单方点「已送达」的时间
    finished_at  TEXT,                                          -- 发布者点「确认收到」的时间

    CHECK (accepter_id <> publisher_id)                         -- 不能接取自己发布的任务（§6 自操作）
);

-- 同一任务最多存在一条「非已终止」跑腿记录；终止后任务恢复 open 可再次被接取，
-- 同时保留多条历史 cancelled 记录（增量契约：跑腿任务删除与双向终止 §3.2）。
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_order_non_cancelled_task
    ON task_order(task_id)
 WHERE status <> 'cancelled';


-- ============================ 5. 购买记录表 ============================
CREATE TABLE IF NOT EXISTS product_order (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES product(id), -- 一件商品可有多条历史订单（终止后可再次售出）
    seller_id    INTEGER NOT NULL REFERENCES user(id),
    buyer_id     INTEGER NOT NULL REFERENCES user(id),
    price        REAL    NOT NULL DEFAULT 0,                     -- 成交价快照，卖家改价不影响历史记录
    status       TEXT    NOT NULL DEFAULT 'created'
                         CHECK (status IN ('created', 'delivered', 'completed', 'cancelled')),
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    delivered_at TEXT,                                           -- 卖家点「确认已交付」的时间
    finished_at  TEXT,                                           -- 买家点「确认收货」的时间
    cancelled_at TEXT,                                           -- 双方同意终止的时间

    CHECK (buyer_id <> seller_id)                                -- 不能购买自己的商品（§6 自操作）
);

-- 同一商品最多存在一条「非已终止」订单；终止后商品恢复 on_sale 可再次售出，
-- 同时保留多条历史 cancelled 订单（增量契约：二手商品软删除确认与订单双向终止 §4.2）。
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_order_non_cancelled_product
    ON product_order(product_id)
 WHERE status <> 'cancelled';


-- ============================ 6. 终止申请记录表 ============================
-- 订单处于 created/delivered 时买卖任一方可发起终止申请，另一方同意后才真正终止。
CREATE TABLE IF NOT EXISTS product_order_termination_request (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES product_order(id),
    requester_id INTEGER NOT NULL REFERENCES user(id),           -- 发起终止的一方
    reason       TEXT    NOT NULL,                               -- 2~200 字，对方可见
    status       TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    responder_id INTEGER REFERENCES user(id),                    -- 处理终止的另一方
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    resolved_at  TEXT
);

-- 同一订单最多存在一条待处理申请
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_order_pending_termination
    ON product_order_termination_request(order_id)
 WHERE status = 'pending';


-- ============================ 7. 跑腿任务终止申请记录表 ============================
-- 任务处于 accepted/delivered 时发布者或接取者任一方可发起终止申请，另一方同意后才真正终止。
CREATE TABLE IF NOT EXISTS task_termination_request (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id      INTEGER NOT NULL REFERENCES task(id),
    requester_id INTEGER NOT NULL REFERENCES user(id),           -- 发起终止的一方
    reason       TEXT    NOT NULL,                               -- 2~200 字，对方可见
    status       TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    responder_id INTEGER REFERENCES user(id),                    -- 处理终止的另一方
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
    resolved_at  TEXT
);

-- 同一任务最多存在一条待处理申请
CREATE UNIQUE INDEX IF NOT EXISTS uq_task_pending_termination
    ON task_termination_request(task_id)
 WHERE status = 'pending';


-- ============================ 索引 ============================
-- 列表页固定按「审核通过 + 未删除」过滤后再按时间/金额排序，故建复合索引
CREATE INDEX IF NOT EXISTS idx_task_list       ON task(audit_status, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_amount     ON task(amount);
CREATE INDEX IF NOT EXISTS idx_task_publisher  ON task(publisher_id);

CREATE INDEX IF NOT EXISTS idx_product_list    ON product(audit_status, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_price   ON product(price);
CREATE INDEX IF NOT EXISTS idx_product_seller  ON product(seller_id);

CREATE INDEX IF NOT EXISTS idx_torder_accepter ON task_order(accepter_id);
CREATE INDEX IF NOT EXISTS idx_porder_buyer    ON product_order(buyer_id);


-- ============================ 视图 ============================
-- 普通用户可见范围。后端查列表一律走视图，避免有人写查询时漏掉过滤条件
-- 导致未审核/已删除内容泄漏到前台（验收清单「边界检查」会查这一条）。
CREATE VIEW IF NOT EXISTS v_public_task AS
    SELECT * FROM task
     WHERE audit_status = 'approved' AND is_deleted = 0;

CREATE VIEW IF NOT EXISTS v_public_product AS
    SELECT * FROM product
     WHERE audit_status = 'approved' AND is_deleted = 0;
