package com.campus.errand.controller;

import com.campus.errand.dto.TerminationRequestCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.ProductService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 二手订单接口（契约 §8.5~§8.7）：查看订单、卖家确认交付、买家确认收货。
 *
 * 全部挂在 /api/product-orders/**，由登录拦截器保证已登录；
 * 买卖双方身份由 Service 根据 session 判定，客户端不得指定角色。
 */
@RestController
@RequestMapping("/api/product-orders")
public class ProductOrderController {

    @Autowired
    private ProductService productService;

    /**
     * GET /api/product-orders/{id} —— 查看订单，仅该订单买家或卖家。
     */
    @GetMapping("/{id}")
    public Result detail(@PathVariable int id, HttpSession session) {
        return Result.ok(productService.getProductOrder(id, currentUser(session).getId()));
    }

    /**
     * PUT /api/product-orders/{id}/deliver —— 卖家确认已线下交付。
     */
    @PutMapping("/{id}/deliver")
    public Result deliver(@PathVariable int id, HttpSession session) {
        productService.deliverProductOrder(id, currentUser(session).getId());
        return Result.ok();
    }

    /**
     * PUT /api/product-orders/{id}/complete —— 买家确认收货。
     */
    @PutMapping("/{id}/complete")
    public Result complete(@PathVariable int id, HttpSession session) {
        productService.completeProductOrder(id, currentUser(session).getId());
        return Result.ok();
    }

    /**
     * POST /api/product-orders/{id}/termination-request —— 发起终止申请。
     */
    @PostMapping("/{id}/termination-request")
    public Result requestTermination(@PathVariable int id, @RequestBody TerminationRequestCreateDTO dto, HttpSession session) {
        int requestId = productService.createTerminationRequest(id, currentUser(session).getId(), dto.getReason());
        return Result.ok(Map.of("id", requestId, "status", "pending"));
    }

    /**
     * DELETE /api/product-orders/{id}/termination-request —— 发起方撤回。
     */
    @DeleteMapping("/{id}/termination-request")
    public Result withdrawTermination(@PathVariable int id, HttpSession session) {
        productService.withdrawTerminationRequest(id, currentUser(session).getId());
        return Result.ok();
    }

    /**
     * PUT /api/product-orders/{id}/termination-request/reject —— 另一方拒绝。
     */
    @PutMapping("/{id}/termination-request/reject")
    public Result rejectTermination(@PathVariable int id, HttpSession session) {
        productService.rejectTerminationRequest(id, currentUser(session).getId());
        return Result.ok();
    }

    /**
     * PUT /api/product-orders/{id}/termination-request/approve —— 另一方同意。
     */
    @PutMapping("/{id}/termination-request/approve")
    public Result approveTermination(@PathVariable int id, HttpSession session) {
        return Result.ok(productService.approveTerminationRequest(id, currentUser(session).getId()));
    }

    private User currentUser(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new BizException(401, "请先登录");
        }
        return user;
    }
}