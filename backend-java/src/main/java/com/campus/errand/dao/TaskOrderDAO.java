package com.campus.errand.dao;

import com.campus.errand.pojo.TaskOrder;
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
 * 跑腿记录表（task_order）数据访问。
 *
 * 接单方「标记送达」用 accepter_id 判定身份，
 * 发布者「确认完成」用 publisher_id 判定身份，均写入 UPDATE 的 WHERE 子句。
 */
@Repository
public class TaskOrderDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 按任务查接单记录。查不到返回 null。
     */
    public TaskOrder findByTaskId(int taskId) {
        String sql = "SELECT * FROM task_order WHERE task_id = ?";
        List<TaskOrder> list = jdbc.query(sql, new BeanPropertyRowMapper<>(TaskOrder.class), taskId);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 插入接单记录，status 固定 accepted。返回自增主键 id。
     */
    public int insert(int taskId, int publisherId, int accepterId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO task_order (task_id, publisher_id, accepter_id, status) "
                  + "VALUES (?, ?, ?, 'accepted')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, taskId);
            ps.setInt(2, publisherId);
            ps.setInt(3, accepterId);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 接单方标记送达：仅本人、且状态为 accepted 时更新，写 delivered_at。
     */
    public int markDelivered(int taskId, int accepterId) {
        return jdbc.update(
                "UPDATE task_order SET status='delivered', delivered_at=datetime('now','localtime') "
              + "WHERE task_id=? AND accepter_id=? AND status='accepted'",
                taskId, accepterId);
    }

    /**
     * 发布者确认完成：仅发布者本人、且状态为 accepted/delivered 时更新，写 finished_at。
     */
    public int markCompleted(int taskId, int publisherId) {
        return jdbc.update(
                "UPDATE task_order SET status='completed', finished_at=datetime('now','localtime') "
              + "WHERE task_id=? AND publisher_id=? AND status IN ('accepted','delivered')",
                taskId, publisherId);
    }
}
