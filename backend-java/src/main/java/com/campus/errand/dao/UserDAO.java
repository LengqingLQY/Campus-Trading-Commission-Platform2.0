package com.campus.errand.dao;

import com.campus.errand.pojo.User;
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
 * 用户表数据访问。
 *
 * 约定：查询单条用 query(...) 取列表再取首条，而不是 queryForObject ——
 * 后者查不到会抛异常，而「查不到」是正常业务分支。
 */
@Repository
public class UserDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 按登录账号查用户。查不到返回 null。
     */
    public User findByAccount(String account) {
        String sql = "SELECT * FROM user WHERE account = ?";
        List<User> list = jdbc.query(sql, new BeanPropertyRowMapper<>(User.class), account);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 按主键查用户。查不到返回 null。
     */
    public User findById(int id) {
        String sql = "SELECT * FROM user WHERE id = ?";
        List<User> list = jdbc.query(sql, new BeanPropertyRowMapper<>(User.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 账号是否已存在。
     */
    public boolean existsByAccount(String account) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM user WHERE account = ?", Integer.class, account);
        return count != null && count > 0;
    }

    /**
     * 插入新用户（role 固定为 user），返回自增主键 id。
     */
    public int insert(User user) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO user (account, password_hash, username, qq, wechat, phone, role) "
                  + "VALUES (?, ?, ?, ?, ?, ?, 'user')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, user.getAccount());
            ps.setString(2, user.getPasswordHash());
            ps.setString(3, user.getUsername());
            ps.setString(4, user.getQq());
            ps.setString(5, user.getWechat());
            ps.setString(6, user.getPhone());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 更新资料（昵称 + 三个联系方式）。空字符串表示清空。
     */
    public int updateProfile(int id, String username, String qq, String wechat, String phone) {
        return jdbc.update(
                "UPDATE user SET username=?, qq=?, wechat=?, phone=?, "
              + "updated_at=datetime('now','localtime') WHERE id=?",
                username, qq, wechat, phone, id);
    }

    /**
     * 更新密码哈希。
     */
    public int updatePassword(int id, String passwordHash) {
        return jdbc.update(
                "UPDATE user SET password_hash=?, updated_at=datetime('now','localtime') WHERE id=?",
                passwordHash, id);
    }
}
