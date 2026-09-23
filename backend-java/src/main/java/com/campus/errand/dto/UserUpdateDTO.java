package com.campus.errand.dto;

/**
 * 修改资料请求体（契约 §6.5）。
 * 所有字段均可选，但至少提供一个需要修改的字段。
 * account / role / status 不可修改，不在此 DTO 中，天然被忽略。
 */
public class UserUpdateDTO {

    private String username;
    private String qq;
    private String wechat;
    private String phone;
    private String oldPassword;
    private String newPassword;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getQq() { return qq; }
    public void setQq(String qq) { this.qq = qq; }

    public String getWechat() { return wechat; }
    public void setWechat(String wechat) { this.wechat = wechat; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOldPassword() { return oldPassword; }
    public void setOldPassword(String oldPassword) { this.oldPassword = oldPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
