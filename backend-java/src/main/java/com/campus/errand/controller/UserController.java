package com.campus.errand.controller;

import com.campus.errand.dto.RegisterDTO;
import com.campus.errand.dto.UserUpdateDTO;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.FileStorageService;
import com.campus.errand.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @Autowired
    private FileStorageService fileStorageService;

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
    public Result login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = userService.checkLogin(body.get("account"), body.get("password"));

        // 防会话固定：登录成功先作废旧会话，再建立全新会话，
        // 避免攻击者预先注入的 JSESSIONID 在登录后被复用。
        HttpSession old = request.getSession(false);
        if (old != null) {
            old.invalidate();
        }
        HttpSession session = request.getSession(true);
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
     * PUT /api/users/me —— 修改当前用户资料 / 改密码 / 恢复默认头像。
     */
    @PutMapping("/users/me")
    public Result updateMe(@RequestBody UserUpdateDTO dto, HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        userService.updateMe(sessionUser.getId(), dto);
        return Result.ok();
    }

    /**
     * POST /api/users/me/avatar —— 上传头像（multipart 字段名 avatar）。
     */
    @PostMapping("/users/me/avatar")
    public Result uploadAvatar(@RequestParam("avatar") MultipartFile avatar, HttpSession session) {
        User sessionUser = (User) session.getAttribute("user");
        String url = fileStorageService.storeImage(avatar);
        userService.updateAvatar(sessionUser.getId(), url);
        return Result.ok(Map.of("avatarUrl", url));
    }
}
