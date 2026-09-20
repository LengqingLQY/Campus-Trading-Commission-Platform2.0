package com.campus.errand.service;

import com.campus.errand.dao.UserDAO;
import com.campus.errand.pojo.User;
import com.campus.errand.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 用户相关业务逻辑。
 *
 * Controller 只管收发 HTTP，具体"怎么算登录成功"这类规则写在这一层。
 */
@Service
public class UserService {

    @Autowired
    private UserDAO userDAO;

    /**
     * 校验登录。成功返回 User，失败返回 null。
     *
     * 注意账号不存在和密码错误都返回 null、前端提示同一句话，
     * 不告诉对方"这个账号存在但密码错了"，避免被拿去撞库枚举账号。
     */
    public User checkLogin(String account, String password) {
        if (account == null || password == null) {
            return null;
        }

        User user = userDAO.findByAccount(account);
        if (user == null) {
            return null;
        }

        if (!PasswordUtil.verify(password, user.getPasswordHash())) {
            return null;
        }

        // 存进 session 前抹掉哈希，避免顺着 session 或返回值泄漏出去
        user.setPasswordHash(null);
        return user;
    }
}
