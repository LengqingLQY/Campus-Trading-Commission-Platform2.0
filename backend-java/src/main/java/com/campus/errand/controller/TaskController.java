package com.campus.errand.controller;

import com.campus.errand.dto.TaskCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.TaskService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 跑腿任务接口（契约 §7）。
 *
 * 公开列表/详情挂在 /api/public/tasks**（无需登录），
 * 发布/接取/送达/完成挂在 /api/tasks/**（需登录，由拦截器保证）。
 */
@RestController
@RequestMapping("/api")
public class TaskController {

    @Autowired
    private TaskService taskService;

    /**
     * GET /api/public/tasks —— 任务列表。
     */
    @GetMapping("/public/tasks")
    public Result list(@RequestParam(required = false) String keyword,
                       @RequestParam(defaultValue = "time_desc") String sort,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "10") int size) {
        return Result.ok(taskService.listTasks(keyword, sort, page, size));
    }

    /**
     * GET /api/public/tasks/{id} —— 任务详情（可带登录态）。
     */
    @GetMapping("/public/tasks/{id}")
    public Result detail(@PathVariable int id, HttpSession session) {
        return Result.ok(taskService.getTask(id, currentUserIdOrNull(session)));
    }

    /**
     * POST /api/tasks —— 发布任务。
     */
    @PostMapping("/tasks")
    public Result create(@RequestBody TaskCreateDTO dto, HttpSession session) {
        int id = taskService.createTask(dto, currentUser(session).getId());
        return Result.ok(Map.of("id", id));
    }

    /**
     * POST /api/tasks/{id}/accept —— 接取任务。
     */
    @PostMapping("/tasks/{id}/accept")
    public Result accept(@PathVariable int id, HttpSession session) {
        int orderId = taskService.acceptTask(id, currentUser(session).getId());
        return Result.ok(Map.of("orderId", orderId));
    }

    /**
     * PUT /api/tasks/{id}/deliver —— 接单方标记已送达。
     */
    @PutMapping("/tasks/{id}/deliver")
    public Result deliver(@PathVariable int id, HttpSession session) {
        taskService.deliverTask(id, currentUser(session).getId());
        return Result.ok();
    }

    /**
     * PUT /api/tasks/{id}/complete —— 发布者确认完成。
     */
    @PutMapping("/tasks/{id}/complete")
    public Result complete(@PathVariable int id, HttpSession session) {
        taskService.completeTask(id, currentUser(session).getId());
        return Result.ok();
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
