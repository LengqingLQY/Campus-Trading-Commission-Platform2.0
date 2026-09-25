package com.campus.errand.pojo;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * 对应 user 表，字段与《数据库设计说明书》§4.1 一一对应。
 *
 * 命名规则：数据库是下划线（password_hash），Java 是驼峰（passwordHash）。
 * BeanPropertyRowMapper 会自动完成这个转换，不用手写 rs.getString()。
 */
public class User {

    private Integer id;
    private String account;
    @JsonIgnore
    private String passwordHash;   // ← password_hash，绝不返回给前端
    private String username;
    private String qq;
    private String wechat;
    private String phone;
    private String avatarUrl;      // 头像 URL（增量契约：图片功能 §2）
    private String role;           // user / admin
    private String status;         // active / banned
    private String createdAt;      // 'YYYY-MM-DD HH:MM:SS'
    private String updatedAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getAccount() { return account; }
    public void setAccount(String account) { this.account = account; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getQq() { return qq; }
    public void setQq(String qq) { this.qq = qq; }

    public String getWechat() { return wechat; }
    public void setWechat(String wechat) { this.wechat = wechat; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
