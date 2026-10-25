package com.campus.errand.dao;

import com.campus.errand.dto.NotificationCounts;
import com.campus.errand.dto.NotificationItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class NotificationDAO {
    private final JdbcTemplate jdbc;
    private static final RowMapper<NotificationItem> ROW = (rs, row) -> {
        String type = rs.getString("type");
        String readAt = rs.getString("read_at");
        return new NotificationItem(rs.getLong("id"), type, type.substring(0, type.indexOf('_')),
                rs.getString("title"), rs.getString("content"), rs.getString("target_type"),
                rs.getInt("target_id"), readAt != null, readAt, rs.getString("created_at"));
    };

    public NotificationDAO(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void insert(int recipientId, String type, String title, String content, String targetType, int targetId) {
        jdbc.update("INSERT INTO notification(recipient_id,type,title,content,target_type,target_id) VALUES(?,?,?,?,?,?)",
                recipientId, type, title, content, targetType, targetId);
    }

    // 分类已由 Service 校验，只绑定参数，不将请求参数拼入 SQL。
    private String filter(int userId, String category, String state, List<Object> args) {
        args.add(userId);
        String where = " WHERE recipient_id=?";
        if (!"all".equals(category)) {
            where += " AND type LIKE ?";
            args.add(category + "_%");
        }
        if ("unread".equals(state)) where += " AND read_at IS NULL";
        return where;
    }

    public List<NotificationItem> list(int userId, String category, String state, int page, int size) {
        List<Object> args = new ArrayList<>();
        String where = filter(userId, category, state, args);
        args.add(size);
        args.add(((long) page - 1) * size);
        return jdbc.query("SELECT * FROM notification" + where + " ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
                ROW, args.toArray());
    }

    public long count(int userId, String category, String state) {
        List<Object> args = new ArrayList<>();
        String where = filter(userId, category, state, args);
        return jdbc.queryForObject("SELECT COUNT(*) FROM notification" + where, Long.class, args.toArray());
    }

    public NotificationCounts counts(int userId) {
        return jdbc.queryForObject("SELECT COUNT(CASE WHEN read_at IS NULL THEN 1 END) AS unread_count, "
                + "COALESCE(MAX(id),0) AS latest_id FROM notification WHERE recipient_id=?",
                (rs, row) -> new NotificationCounts(rs.getLong("unread_count"), rs.getLong("latest_id")), userId);
    }

    public NotificationItem find(long id, int userId) {
        List<NotificationItem> rows = jdbc.query("SELECT * FROM notification WHERE id=? AND recipient_id=?", ROW, id, userId);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    public void markRead(long id, int userId) {
        jdbc.update("UPDATE notification SET read_at=datetime('now','localtime') WHERE id=? AND recipient_id=? AND read_at IS NULL",
                id, userId);
    }

    public int markAll(int userId, long upToId) {
        return jdbc.update("UPDATE notification SET read_at=datetime('now','localtime') WHERE recipient_id=? AND read_at IS NULL AND id<=?",
                userId, upToId);
    }
}
