package com.campus.errand.dao;

import com.campus.errand.pojo.TaskTerminationRequest;
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
 * 跑腿任务终止申请表（task_termination_request）数据访问。
 *
 * 一条任务最多存在一条 pending 申请，由部分唯一索引兜底；
 * 这里的方法都用带状态条件的 UPDATE，返回受影响行数，供 Service 判断并发冲突。
 */
@Repository
public class TaskTerminationRequestDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 发起终止申请，status 固定 pending。返回自增主键 id。
     */
    public int insert(int taskId, int requesterId, String reason) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO task_termination_request (task_id, requester_id, reason, status) "
                  + "VALUES (?, ?, ?, 'pending')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, taskId);
            ps.setInt(2, requesterId);
            ps.setString(3, reason);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 按任务查待处理申请。无待处理申请返回 null。
     */
    public TaskTerminationRequest findPendingByTaskId(int taskId) {
        String sql = "SELECT r.id, r.requester_id AS requesterId, r.reason, r.status, "
                + "r.created_at AS createdAt, u.username AS requesterName "
                + "FROM task_termination_request r "
                + "JOIN user u ON u.id = r.requester_id "
                + "WHERE r.task_id = ? AND r.status = 'pending'";
        List<TaskTerminationRequest> list = jdbc.query(sql, new BeanPropertyRowMapper<>(TaskTerminationRequest.class), taskId);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 是否存在待处理申请。
     */
    public boolean hasPending(int taskId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM task_termination_request WHERE task_id = ? AND status = 'pending'",
                Integer.class, taskId);
        return count != null && count > 0;
    }

    /**
     * 发起方撤回：仅本人、且申请仍为 pending 时更新。返回受影响行数。
     */
    public int markWithdrawn(int requestId, int requesterId) {
        return jdbc.update(
                "UPDATE task_termination_request SET status='withdrawn', resolved_at=datetime('now','localtime') "
              + "WHERE id=? AND requester_id=? AND status='pending'",
                requestId, requesterId);
    }

    /**
     * 另一方同意/拒绝：仅申请仍为 pending 时更新，写入处理人与处理时间。返回受影响行数。
     */
    public int markResolved(int requestId, int responderId, String status) {
        return jdbc.update(
                "UPDATE task_termination_request SET status=?, responder_id=?, resolved_at=datetime('now','localtime') "
              + "WHERE id=? AND status='pending'",
                status, responderId, requestId);
    }
}