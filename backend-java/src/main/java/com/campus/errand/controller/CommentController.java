package com.campus.errand.controller;

import java.util.Map;

import com.campus.errand.dto.CommentCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.CommentService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 评论接口（增量契约：商品与跑腿详情评论及修改 §3）。
 *
 * 读列表挂 /api/public/{resource}/{id}/comments（游客可读，{resource}=products|tasks）；
 * 发表/删除挂 /api/{resource}/{id}/comments（需登录，由拦截器保证）。
 */
@RestController
@RequestMapping("/api")
public class CommentController {

    @Autowired
    private CommentService commentService;

    /** GET /api/public/{products|tasks}/{id}/comments —— 分页读取评论（公开）。 */
    @GetMapping("/public/{resource}/{id}/comments")
    public Result list(@PathVariable String resource, @PathVariable int id,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "10") int size) {
        return Result.ok(commentService.list(resourceType(resource), id, page, size));
    }

    /** POST /api/{products|tasks}/{id}/comments —— 发表评论/回复。 */
    @PostMapping("/{resource}/{id}/comments")
    public Result create(@PathVariable String resource, @PathVariable int id,
                         @RequestBody CommentCreateDTO dto, HttpSession session) {
        return Result.ok(commentService.create(resourceType(resource), id, currentUser(session).getId(), dto));
    }

    /** DELETE /api/{products|tasks}/{id}/comments/{commentId} —— 删除本人评论。 */
    @DeleteMapping("/{resource}/{id}/comments/{commentId}")
    public Result delete(@PathVariable String resource, @PathVariable int id,
                         @PathVariable int commentId, HttpSession session) {
        commentService.delete(resourceType(resource), id, commentId, currentUser(session).getId());
        return Result.ok(Map.of("id", commentId));
    }

    /** 前端路径用复数 products/tasks，落库用单数 product/task。 */
    private static String resourceType(String resource) {
        if ("products".equals(resource)) {
            return "product";
        }
        if ("tasks".equals(resource)) {
            return "task";
        }
        throw new BizException(400, "资源类型不合法");
    }

    private User currentUser(HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            throw new BizException(401, "请先登录");
        }
        return user;
    }
}
