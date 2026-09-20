package com.campus.errand.controller;

import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 账号相关接口。骨架阶段只实现 POST /api/login，用于验证整条链路：
 *
 *   浏览器 --JSON--> Controller --> Service --> DAO --> JdbcTemplate --> app.db
 *          <--JSON--        <--        <--        <--
 *
 * 对比 Javatest 的 LoginController：那边继承 HttpServlet、重写 doPost、
 * 手动 request.getParameter()、手动 forward 到 jsp；
 * 这边 @PostMapping 直接映射，@RequestBody 自动把 JSON 转成 Map，
 * 返回的 Result 对象由 Jackson 自动转回 JSON。
 */
@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * POST /api/login
     * 入参：{"account":"admin", "password":"admin123"}
     * 出参：{"code":0, "msg":"ok", "data":{"id":1,"account":"admin","username":"...","role":"admin"}}
     */
    @PostMapping("/login")
    public Result login(@RequestBody Map<String, String> body, HttpSession session) {

        User user = userService.checkLogin(body.get("account"), body.get("password"));

        if (user == null) {
            return Result.fail(401, "账号或密码错误");
        }

        // 登录态存 session，后续接口靠它识别当前用户（对应 Javatest 里的
        // session.setAttribute("user", user)，写法完全一样）
        session.setAttribute("user", user);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("account", user.getAccount());
        data.put("username", user.getUsername());
        data.put("role", user.getRole());
        return Result.ok(data);
    }

    /**
     * GET /api/users/me —— 验证 session 确实生效了（第二个验证点）
     */
    @GetMapping("/users/me")
    public Result me(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return Result.fail(401, "未登录");
        }
        return Result.ok(user);
    }
}
