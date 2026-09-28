package com.campus.errand.dao;

import com.campus.errand.pojo.Comment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

/**
 * 评论表数据访问。软删除（父评论被删保留行），子回复的 reply_to_id 不悬空。
 */
@Repository
public class CommentDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 分页读取某资源下的未删除评论与回复，按时间正序、id 正序。
     * 用自定义 RowMapper 组装嵌套 replyTo（区别于 BeanPropertyRowMapper，replyTo 是嵌套对象）。
     */
    public List<Comment> findPage(String resourceType, int resourceId, int offset, int size) {
        String sql = "SELECT c.id, c.author_id, c.content, c.created_at, c.reply_to_id, "
                + "u.username AS authorName, "
                + "substr(p.content, 1, 160) AS replyToContent, "
                + "p.is_deleted AS replyToDeleted, pu.username AS replyToAuthorName "
                + "FROM comment c "
                + "JOIN user u ON u.id = c.author_id "
                + "LEFT JOIN comment p ON p.id = c.reply_to_id "
                + "LEFT JOIN user pu ON pu.id = p.author_id "
                + "WHERE c.resource_type = ? AND c.resource_id = ? AND c.is_deleted = 0 "
                + "ORDER BY c.created_at ASC, c.id ASC "
                + "LIMIT ? OFFSET ?";
        return jdbc.query(sql, new CommentRowMapper(), resourceType, resourceId, size, offset);
    }

    /** 某资源下未删除评论与回复总数。 */
    public long count(String resourceType, int resourceId) {
        String sql = "SELECT COUNT(*) FROM comment WHERE resource_type = ? AND resource_id = ? AND is_deleted = 0";
        Long count = jdbc.queryForObject(sql, Long.class, resourceType, resourceId);
        return count == null ? 0 : count;
    }

    /** 查原始行（含 resource_type/resource_id/author_id/is_deleted），供删除/回复校验。 */
    public Comment findById(int id) {
        String sql = "SELECT * FROM comment WHERE id = ?";
        List<Comment> list = jdbc.query(sql, new BeanPropertyRowMapper<>(Comment.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /** 插入评论/回复，返回自增主键 id。 */
    public int insert(String resourceType, int resourceId, int authorId, Integer replyToId, String content) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO comment (resource_type, resource_id, author_id, reply_to_id, content) "
                  + "VALUES (?, ?, ?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, resourceType);
            ps.setInt(2, resourceId);
            ps.setInt(3, authorId);
            if (replyToId == null) {
                ps.setNull(4, java.sql.Types.INTEGER);
            } else {
                ps.setInt(4, replyToId);
            }
            ps.setString(5, content);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /** 作者软删除本人评论，返回受影响行数（0 = 非本人 / 已删除）。 */
    public int softDelete(int id, int authorId) {
        return jdbc.update(
                "UPDATE comment SET is_deleted=1, deleted_by=?, deleted_at=datetime('now','localtime') "
              + "WHERE id=? AND author_id=? AND is_deleted=0",
                authorId, id, authorId);
    }

    /** 组装对外字段 + 嵌套 replyTo。父评论删除时 replyTo 只返回 id + deleted=true。 */
    private static class CommentRowMapper implements RowMapper<Comment> {
        @Override
        public Comment mapRow(ResultSet rs, int rowNum) throws SQLException {
            Comment c = new Comment();
            c.setId(rs.getInt("id"));
            c.setAuthorId(rs.getInt("author_id"));
            c.setAuthorName(rs.getString("authorName"));
            c.setContent(rs.getString("content"));
            c.setCreatedAt(rs.getString("created_at"));

            int replyToId = rs.getInt("reply_to_id");
            if (!rs.wasNull()) {
                Comment.ReplyTo replyTo = new Comment.ReplyTo();
                replyTo.setId(replyToId);
                int deleted = rs.getInt("replyToDeleted");
                if (deleted == 1) {
                    replyTo.setDeleted(true);
                } else {
                    replyTo.setDeleted(false);
                    replyTo.setAuthorName(rs.getString("replyToAuthorName"));
                    replyTo.setContent(rs.getString("replyToContent"));
                }
                c.setReplyTo(replyTo);
            }
            return c;
        }
    }
}
