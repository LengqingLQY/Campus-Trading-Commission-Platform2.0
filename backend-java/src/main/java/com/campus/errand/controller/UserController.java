package com.campus.errand.controller;

import com.campus.errand.dto.RegisterDTO;
import com.campus.errand.dto.UserUpdateDTO;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 账号相关接口：注册、登录、退出、查看/修改当前用户资料（契约 §6）。
 *
 * 业务失败由 Service 抛 BizException，本层不写失败分支。
 */
@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * POST /api/register —— 注册，返回新用户 id。
     */
    @PostMapping("/register")
    public Result register(@RequestBody RegisterDTO dto) {
        int id = userService.register(dto);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", id);
        return Result.ok(data);
    }

    /**
     * POST /api/login —— 登录，写入 session，返回当前用户概要。
     */
    @PostMapping("/login")
    public Result login(@RequestBody Map<String, String> body, HttpSession session) {
        User user = userService.checkLogin(body.get("account"), body.get("password"));

        // 登录态存 session，后续接口靠它识别当前用户
        session.setAttribute("user", user);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", user.getId());
        data.put("account", user.getAccount());
        data.put("username", user.getUsername());
        data.put("role", user.getRole());
        return Result.ok(data);
    }

    /**
     * POST /api/logout —— 退出，销毁 session。
     */
    @PostMapping("/logout")
    public Result logout(HttpSession session) {
        session.invalidate();
        return Result.ok();
    }

    /**
     * GET /api/users/me —— 查看当前用户资料（从库取最新，非 session 快照）。
     */
    @GetMapping("/users/me")
    public Result me(HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        return Result.ok(userService.getMe(sessionUser.getId()));
    }

    /**
     * PUT /api/users/me —— 修改当前用户资料 / 改密码。
     */
    @PutMapping("/users/me")
    public Result updateMe(@RequestBody UserUpdateDTO dto, HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        userService.updateMe(sessionUser.getId(), dto);
        return Result.ok();
    }
}
