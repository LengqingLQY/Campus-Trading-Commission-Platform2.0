package com.campus.errand.dao;

import com.campus.errand.dto.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class RatingDAO {
    private final JdbcTemplate jdbc;

    public RatingDAO(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /**
     * 插入语句同时读取订单、判定参与者及完成状态。事务先写后读，避免 SQLite
     * 并发提交时从读事务升级写事务产生 SQLITE_BUSY；唯一索引决定重复提交结果。
     */
    public RatingReceipt insertProduct(int orderId, int reviewerId, int stars) {
        return insert("""
                INSERT INTO rating(product_order_id, reviewer_id, reviewee_id, reviewee_role, stars)
                SELECT id, ?, CASE WHEN buyer_id=? THEN seller_id ELSE buyer_id END,
                       CASE WHEN buyer_id=? THEN 'seller' ELSE 'buyer' END, ?
                FROM product_order WHERE id=? AND status='completed' AND (buyer_id=? OR seller_id=?)
                ON CONFLICT DO NOTHING
                RETURNING id, stars, reviewee_id, reviewee_role
                """, orderId, reviewerId, stars);
    }

    public RatingReceipt insertTask(int orderId, int reviewerId, int stars) {
        return insert("""
                INSERT INTO rating(task_order_id, reviewer_id, reviewee_id, reviewee_role, stars)
                SELECT id, ?, CASE WHEN publisher_id=? THEN accepter_id ELSE publisher_id END,
                       CASE WHEN publisher_id=? THEN 'seller' ELSE 'buyer' END, ?
                FROM task_order WHERE id=? AND status='completed' AND (publisher_id=? OR accepter_id=?)
                ON CONFLICT DO NOTHING
                RETURNING id, stars, reviewee_id, reviewee_role
                """, orderId, reviewerId, stars);
    }

    private RatingReceipt insert(String sql, int orderId, int reviewerId, int stars) {
        List<RatingReceipt> rows = jdbc.query(sql, (rs, row) -> new RatingReceipt(
                rs.getInt("id"), rs.getInt("stars"), rs.getInt("reviewee_id"), rs.getString("reviewee_role")),
                reviewerId, reviewerId, reviewerId, stars, orderId, reviewerId, reviewerId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public RatingSummary summary(int userId, String role) {
        return jdbc.queryForObject("SELECT AVG(stars) AS average, COUNT(*) AS count FROM rating "
                        + "WHERE reviewee_id=? AND reviewee_role=?",
                (rs, row) -> new RatingSummary((Double) rs.getObject("average"), rs.getLong("count")), userId, role);
    }

    public Integer myStars(String kind, int orderId, int userId) {
        String column = "product".equals(kind) ? "product_order_id" : "task_order_id";
        List<Integer> rows = jdbc.query("SELECT stars FROM rating WHERE " + column + "=? AND reviewer_id=?",
                (rs, row) -> rs.getInt("stars"), orderId, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static final String ORDERS = """
            WITH viewer AS (SELECT ? AS id), orders AS (
                SELECT 'product' AS kind, o.id AS orderId, p.title, u.id AS counterpartyId,
                       u.username AS counterpartyName,
                       CASE WHEN o.buyer_id=v.id THEN 'seller' ELSE 'buyer' END AS counterpartRole,
                       COALESCE(o.finished_at, o.created_at) AS finishedAt, r.stars AS myRatingStars
                FROM product_order o JOIN product p ON p.id=o.product_id CROSS JOIN viewer v
                JOIN user u ON u.id=CASE WHEN o.buyer_id=v.id THEN o.seller_id ELSE o.buyer_id END
                LEFT JOIN rating r ON r.product_order_id=o.id AND r.reviewer_id=v.id
                WHERE o.status='completed' AND (o.buyer_id=v.id OR o.seller_id=v.id)
                UNION ALL
                SELECT 'task', o.id, t.title, u.id, u.username,
                       CASE WHEN o.publisher_id=v.id THEN 'seller' ELSE 'buyer' END,
                       COALESCE(o.finished_at, o.created_at), r.stars
                FROM task_order o JOIN task t ON t.id=o.task_id CROSS JOIN viewer v
                JOIN user u ON u.id=CASE WHEN o.publisher_id=v.id THEN o.accepter_id ELSE o.publisher_id END
                LEFT JOIN rating r ON r.task_order_id=o.id AND r.reviewer_id=v.id
                WHERE o.status='completed' AND (o.publisher_id=v.id OR o.accepter_id=v.id)
            )
            """;

    public List<RatingOrderItem> orders(int userId, String state, int offset, int size) {
        return jdbc.query(ORDERS + """
                SELECT * FROM orders WHERE (?='all' OR myRatingStars IS NULL)
                ORDER BY finishedAt DESC, kind, orderId DESC LIMIT ? OFFSET ?
                """, (rs, row) -> new RatingOrderItem(rs.getString("kind"), rs.getInt("orderId"),
                rs.getString("title"), rs.getInt("counterpartyId"), rs.getString("counterpartyName"),
                rs.getString("counterpartRole"), rs.getString("finishedAt"), (Integer) rs.getObject("myRatingStars")),
                userId, state, size, offset);
    }

    public long countOrders(int userId, String state) {
        return jdbc.queryForObject(ORDERS + "SELECT COUNT(*) FROM orders WHERE (?='all' OR myRatingStars IS NULL)",
                Long.class, userId, state);
    }
}
