package com.campus.errand.dto;

/**
 * 注册请求体（契约 §6.1）。
 * role / status / passwordHash 等字段不在此 DTO 中，天然被忽略。
 */
public class RegisterDTO {

    private String account;
    private String password;
    private String username;
    private String qq;
    private String wechat;
    private String phone;

    public String getAccount() { return account; }
    public void setAccount(String account) { this.account = account; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getQq() { return qq; }
    public void setQq(String qq) { this.qq = qq; }

    public String getWechat() { return wechat; }
    public void setWechat(String wechat) { this.wechat = wechat; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
