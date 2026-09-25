package com.campus.errand.controller;

import com.campus.errand.dto.ProductCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 二手商品接口（契约 §8）。
 */
@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService productService;

    /**
     * GET /api/public/products —— 商品列表。
     */
    @GetMapping("/public/products")
    public Result list(@RequestParam(required = false) String keyword,
                       @RequestParam(defaultValue = "time_desc") String sort,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "10") int size) {
        return Result.ok(productService.listProducts(keyword, sort, page, size));
    }

    /**
     * GET /api/public/products/{id} —— 商品详情（可带登录态）。
     */
    @GetMapping("/public/products/{id}")
    public Result detail(@PathVariable int id, HttpSession session) {
        return Result.ok(productService.getProduct(id, currentUserIdOrNull(session)));
    }

    /**
     * POST /api/products —— 发布商品。
     */
    @PostMapping("/products")
    public Result create(@RequestBody ProductCreateDTO dto, HttpSession session) {
        int id = productService.createProduct(dto, currentUser(session).getId());
        return Result.ok(Map.of("id", id));
    }

    /**
     * POST /api/products/{id}/buy —— 购买商品。
     */
    @PostMapping("/products/{id}/buy")
    public Result buy(@PathVariable int id, HttpSession session) {
        int orderId = productService.buyProduct(id, currentUser(session).getId());
        return Result.ok(Map.of("orderId", orderId));
    }

    /**
     * DELETE /api/products/{id} —— 发布者软删除自己的商品。
     */
    @DeleteMapping("/products/{id}")
    public Result delete(@PathVariable int id, HttpSession session) {
        productService.deleteProduct(id, currentUser(session).getId());
        return Result.ok(Map.of("id", id));
    }

    private User currentUser(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new BizException(401, "请先登录");
        }
        return user;
    }

    private Integer currentUserIdOrNull(HttpSession session) {
        User user = (User) session.getAttribute("user");
        return user == null ? null : user.getId();
    }
}
