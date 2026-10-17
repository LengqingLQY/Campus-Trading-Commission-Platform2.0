CREATE TABLE IF NOT EXISTS rating (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_order_id INTEGER REFERENCES product_order(id),
    task_order_id INTEGER REFERENCES task_order(id),
    reviewer_id INTEGER NOT NULL REFERENCES user(id),
    reviewee_id INTEGER NOT NULL REFERENCES user(id),
    reviewee_role TEXT NOT NULL CHECK (reviewee_role IN ('buyer', 'seller')),
    stars INTEGER NOT NULL CHECK (typeof(stars) = 'integer' AND stars BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    CHECK ((product_order_id IS NOT NULL) <> (task_order_id IS NOT NULL)),
    CHECK (reviewer_id <> reviewee_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_product_reviewer
    ON rating(product_order_id, reviewer_id) WHERE product_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_task_reviewer
    ON rating(task_order_id, reviewer_id) WHERE task_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rating_reviewee_role ON rating(reviewee_id, reviewee_role);
