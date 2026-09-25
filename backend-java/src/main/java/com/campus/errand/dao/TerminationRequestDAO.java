package com.campus.errand.dao;

import com.campus.errand.pojo.TerminationRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

/**
 * 订单终止申请表（product_order_termination_request）数据访问。
 *
 * 一条订单最多存在一条 pending 申请，由部分唯一索引兜底；
 * 这里的方法都用带状态条件的 UPDATE，返回受影响行数，供 Service 判断并发冲突。
 */
@Repository
public class TerminationRequestDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 发起终止申请，status 固定 pending。返回自增主键 id。
     */
    public int insert(int orderId, int requesterId, String reason) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO product_order_termination_request (order_id, requester_id, reason, status) "
                  + "VALUES (?, ?, ?, 'pending')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, orderId);
            ps.setInt(2, requesterId);
            ps.setString(3, reason);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 按订单查待处理申请，requesterRole 由订单买卖双方计算。无待处理申请返回 null。
     */
    public TerminationRequest findPendingByOrderId(int orderId) {
        String sql = "SELECT r.id, r.status, r.reason, r.created_at AS createdAt, "
                + "CASE WHEN r.requester_id = o.buyer_id THEN 'buyer' ELSE 'seller' END AS requesterRole, "
                + "u.username AS requesterName "
                + "FROM product_order_termination_request r "
                + "JOIN product_order o ON o.id = r.order_id "
                + "JOIN user u ON u.id = r.requester_id "
                + "WHERE r.order_id = ? AND r.status = 'pending'";
        List<TerminationRequest> list = jdbc.query(sql, new BeanPropertyRowMapper<>(TerminationRequest.class), orderId);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 是否存在待处理申请。
     */
    public boolean hasPending(int orderId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_order_termination_request WHERE order_id = ? AND status = 'pending'",
                Integer.class, orderId);
        return count != null && count > 0;
    }

    /**
     * 发起方撤回：仅本人、且申请仍为 pending 时更新。返回受影响行数。
     */
    public int markWithdrawn(int requestId, int requesterId) {
        return jdbc.update(
                "UPDATE product_order_termination_request SET status='withdrawn', resolved_at=datetime('now','localtime') "
              + "WHERE id=? AND requester_id=? AND status='pending'",
                requestId, requesterId);
    }

    /**
     * 另一方同意/拒绝：仅申请仍为 pending 时更新，写入处理人与处理时间。返回受影响行数。
     */
    public int markResolved(int requestId, int responderId, String status) {
        return jdbc.update(
                "UPDATE product_order_termination_request SET status=?, responder_id=?, resolved_at=datetime('now','localtime') "
              + "WHERE id=? AND status='pending'",
                status, responderId, requestId);
    }
}