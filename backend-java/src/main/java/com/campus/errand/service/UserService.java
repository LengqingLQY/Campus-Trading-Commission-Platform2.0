package com.campus.errand.service;

import com.campus.errand.dao.UserDAO;
import com.campus.errand.dto.RegisterDTO;
import com.campus.errand.dto.UserUpdateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.User;
import com.campus.errand.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 用户相关业务逻辑。
 *
 * 业务失败统一抛 {@link BizException}，由 GlobalExceptionHandler 转成统一响应；
 * Controller 只收发 HTTP，不写规则。
 */
@Service
public class UserService {

    @Autowired
    private UserDAO userDAO;

    /**
     * 校验登录。成功返回 User（已抹掉密码哈希），失败抛 401。
     *
     * 账号不存在和密码错误抛同样的「账号或密码错误」，
     * 不告诉对方「这个账号存在但密码错了」，避免被拿去撞库枚举账号。
     */
    public User checkLogin(String account, String password) {
        if (account == null || password == null) {
            throw new BizException(401, "账号或密码错误");
        }
        User user = userDAO.findByAccount(account);
        if (user == null || !PasswordUtil.verify(password, user.getPasswordHash())) {
            throw new BizException(401, "账号或密码错误");
        }
        // 存进 session 前抹掉哈希，避免顺着 session 或返回值泄漏出去
        user.setPasswordHash(null);
        return user;
    }

    /**
     * 注册，返回新用户 id。账号重复返回 409。
     */
    public int register(RegisterDTO dto) {
        String account = dto.getAccount();
        String password = dto.getPassword();
        String username = dto.getUsername();

        if (account == null || account.trim().isEmpty()) {
            throw new BizException(400, "账号不能为空");
        }
        if (password == null || password.length() < 6) {
            throw new BizException(400, "密码长度至少 6 位");
        }
        if (username == null || username.trim().isEmpty()) {
            throw new BizException(400, "昵称不能为空");
        }
        if (userDAO.existsByAccount(account)) {
            throw new BizException(409, "账号已存在");
        }

        User user = new User();
        user.setAccount(account);
        user.setPasswordHash(PasswordUtil.generate(password));
        user.setUsername(username);
        user.setQq(dto.getQq());
        user.setWechat(dto.getWechat());
        user.setPhone(dto.getPhone());
        return userDAO.insert(user);
    }

    /**
     * 按 id 查当前用户资料（最新数据，非 session 快照）。
     */
    public User getMe(int id) {
        User user = userDAO.findById(id);
        if (user == null) {
            throw new BizException(401, "未登录");
        }
        user.setPasswordHash(null);
        return user;
    }

    /**
     * 修改资料 / 改密码。至少提供一个需要修改的字段。
     */
    public void updateMe(int id, UserUpdateDTO dto) {
        User current = userDAO.findById(id);
        if (current == null) {
            throw new BizException(401, "未登录");
        }

        boolean hasProfile = dto.getUsername() != null || dto.getQq() != null
                || dto.getWechat() != null || dto.getPhone() != null;
        boolean hasOld = dto.getOldPassword() != null;
        boolean hasNew = dto.getNewPassword() != null;

        // 改密码必须成对提供旧密码与新密码
        if (hasOld != hasNew) {
            throw new BizException(400, "修改密码需同时提供旧密码和新密码");
        }
        if (!hasProfile && !hasOld) {
            throw new BizException(400, "没有需要修改的内容");
        }

        if (hasOld) {
            if (!PasswordUtil.verify(dto.getOldPassword(), current.getPasswordHash())) {
                throw new BizException(401, "旧密码不正确");
            }
            if (dto.getNewPassword().length() < 6) {
                throw new BizException(400, "新密码长度至少 6 位");
            }
            userDAO.updatePassword(id, PasswordUtil.generate(dto.getNewPassword()));
        }

        if (hasProfile) {
            // 未提供的字段保持原值，空字符串表示清空
            String username = dto.getUsername() != null ? dto.getUsername() : current.getUsername();
            String qq = dto.getQq() != null ? dto.getQq() : current.getQq();
            String wechat = dto.getWechat() != null ? dto.getWechat() : current.getWechat();
            String phone = dto.getPhone() != null ? dto.getPhone() : current.getPhone();
            userDAO.updateProfile(id, username, qq, wechat, phone);
        }
    }
}
