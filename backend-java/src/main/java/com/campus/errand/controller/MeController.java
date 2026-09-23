package com.campus.errand.controller;

import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.ProductService;
import com.campus.errand.service.TaskService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 个人空间接口（契约 §9）：我发布的 / 我接取的任务、我发布的 / 我购买的商品。
 *
 * 全部挂在 /api/me/**，由拦截器保证已登录。
 */
@RestController
@RequestMapping("/api/me")
public class MeController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private ProductService productService;

    /**
     * GET /api/me/tasks?type=published|accepted —— 我的任务。
     */
    @GetMapping("/tasks")
    public Result myTasks(@RequestParam(defaultValue = "published") String type,
                          @RequestParam(defaultValue = "1") int page,
                          @RequestParam(defaultValue = "10") int size,
                          HttpSession session) {
        return Result.ok(taskService.myTasks(currentUser(session).getId(), type, page, size));
    }

    /**
     * GET /api/me/products?type=published|bought —— 我的商品。
     */
    @GetMapping("/products")
    public Result myProducts(@RequestParam(defaultValue = "published") String type,
                             @RequestParam(defaultValue = "1") int page,
                             @RequestParam(defaultValue = "10") int size,
                             HttpSession session) {
        return Result.ok(productService.myProducts(currentUser(session).getId(), type, page, size));
    }

    private User currentUser(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new BizException(401, "请先登录");
        }
        return user;
    }
}
