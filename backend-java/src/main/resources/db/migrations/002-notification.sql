CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER NOT NULL REFERENCES user(id),
    type TEXT NOT NULL CHECK (type IN (
        'audit_approved', 'audit_rejected',
        'order_created', 'order_delivered', 'order_completed',
        'termination_requested', 'termination_withdrawn',
        'termination_rejected', 'termination_approved'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN (
        'product_record', 'task_record', 'product_order', 'task_order'
    )),
    target_id INTEGER NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_notification_recipient_time
    ON notification(recipient_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notification_unread_time
    ON notification(recipient_id, created_at DESC, id DESC) WHERE read_at IS NULL;
