package com.campus.errand.dao;

import com.campus.errand.pojo.Task;
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
 * 跑腿任务表数据访问。
 *
 * 公开查询一律走 v_public_task 视图（已过滤 audit_status='approved' AND is_deleted=0），
 * 避免有人写查询时漏掉过滤条件导致未审核/已删除内容泄漏。
 */
@Repository
public class TaskDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 关键词检索 + 排序 + 分页的公开任务列表。
     * orderBy 由调用方从白名单算出，直接拼接（不允许用户输入）。
     */
    public List<Task> findPublic(String keyword, String orderBy, int offset, int size) {
        String p = likePattern(keyword);
        String sql = "SELECT t.id, t.title, t.description, t.pickup, t.delivery, t.deadline, t.amount, "
                + "t.status, t.publisher_id, t.created_at, u.username AS publisherName "
                + "FROM v_public_task t JOIN user u ON u.id = t.publisher_id "
                + "WHERE t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\' "
                + "ORDER BY " + orderBy + " LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Task.class), p, p, size, offset);
    }

    /**
     * 公开任务总数（分页 total）。
     */
    public long countPublic(String keyword) {
        String p = likePattern(keyword);
        String sql = "SELECT COUNT(*) FROM v_public_task t "
                + "WHERE t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\'";
        Long count = jdbc.queryForObject(sql, Long.class, p, p);
        return count == null ? 0 : count;
    }

    /**
     * 公开任务详情（列表字段 + contact + updatedAt + 审核字段，用于发布者本人展示）。
     * 查不到（不存在 / 未审核 / 已删除）返回 null。
     */
    public Task findPublicDetail(int id) {
        String sql = "SELECT t.id, t.title, t.description, t.pickup, t.delivery, t.deadline, t.amount, "
                + "t.contact, t.audit_status, t.audit_remark, t.status, t.publisher_id, t.created_at, t.updated_at, "
                + "u.username AS publisherName "
                + "FROM v_public_task t JOIN user u ON u.id = t.publisher_id WHERE t.id = ?";
        List<Task> list = jdbc.query(sql, new BeanPropertyRowMapper<>(Task.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 查原表（不做公开过滤），用于 Service 判断发布者、审核状态、软删除等。
     */
    public Task findById(int id) {
        String sql = "SELECT * FROM task WHERE id = ?";
        List<Task> list = jdbc.query(sql, new BeanPropertyRowMapper<>(Task.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 发布任务：audit_status 固定 approved、status 固定 open。
     * 返回自增主键 id。
     */
    public int insert(Task task) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO task (publisher_id, title, description, pickup, delivery, deadline, amount, contact, audit_status, status) "
                  + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'open')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, task.getPublisherId());
            ps.setString(2, task.getTitle());
            ps.setString(3, task.getDescription());
            ps.setString(4, task.getPickup());
            ps.setString(5, task.getDelivery());
            ps.setString(6, task.getDeadline());
            ps.setDouble(7, task.getAmount());
            ps.setString(8, task.getContact());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 接取任务：状态判断写入 WHERE，返回受影响行数（0 = 已被接取 / 不可接）。
     */
    public int accept(int taskId) {
        return jdbc.update(
                "UPDATE task SET status='accepted', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status='open' AND audit_status='approved' AND is_deleted=0",
                taskId);
    }

    /**
     * 标记已送达：仅当任务当前为 accepted。
     */
    public int markDelivered(int taskId) {
        return jdbc.update(
                "UPDATE task SET status='delivered', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status='accepted'",
                taskId);
    }

    /**
     * 确认完成：允许从 accepted 或 delivered 进入 completed。
     */
    public int markCompleted(int taskId) {
        return jdbc.update(
                "UPDATE task SET status='completed', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status IN ('accepted','delivered')",
                taskId);
    }

    /** 个人空间：我发布的任务（含审核字段；有接单记录时附接单人信息）。 */
    public List<Task> findPublishedByUser(int publisherId, int offset, int size) {
        String sql = "SELECT t.*, o.id AS orderId, o.accepter_id AS accepterId, "
                + "u2.username AS accepterName, o.status AS orderStatus "
                + "FROM task t "
                + "LEFT JOIN task_order o ON o.task_id = t.id "
                + "LEFT JOIN user u2 ON u2.id = o.accepter_id "
                + "WHERE t.publisher_id = ? AND t.is_deleted = 0 "
                + "ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Task.class), publisherId, size, offset);
    }

    public long countPublishedByUser(int publisherId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM task WHERE publisher_id = ? AND is_deleted = 0",
                Long.class, publisherId);
        return count == null ? 0 : count;
    }

    /** 个人空间：我接取的任务（附订单状态与各时间点）。 */
    public List<Task> findAcceptedByUser(int accepterId, int offset, int size) {
        String sql = "SELECT t.*, o.id AS orderId, o.status AS orderStatus, o.created_at AS acceptTime, "
                + "o.delivered_at AS deliveredAt, o.finished_at AS finishedAt "
                + "FROM task_order o JOIN task t ON t.id = o.task_id "
                + "WHERE o.accepter_id = ? "
                + "ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Task.class), accepterId, size, offset);
    }

    public long countAcceptedByUser(int accepterId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM task_order WHERE accepter_id = ?",
                Long.class, accepterId);
        return count == null ? 0 : count;
    }

    private static String likePattern(String keyword) {
        if (keyword == null || keyword.isEmpty()) {
            return "%";
        }
        String esc = keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + esc + "%";
    }
}
