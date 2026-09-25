package com.campus.errand.controller;

import com.campus.errand.dto.AdminAuditDTO;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.AdminService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 管理员接口（增量契约：管理员模块）。
 *
 * 全部挂在 /api/admin/**，由 AdminInterceptor 保证登录且 role=admin。
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    /** GET /api/admin/stats —— 管理面板统计。 */
    @GetMapping("/stats")
    public Result stats() {
        return Result.ok(adminService.stats());
    }

    /** GET /api/admin/tasks —— 任务列表（含待审核，可按 auditStatus 过滤）。 */
    @GetMapping("/tasks")
    public Result tasks(@RequestParam(required = false) String auditStatus,
                        @RequestParam(required = false) String keyword,
                        @RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size) {
        return Result.ok(adminService.listTasks(auditStatus, keyword, page, size));
    }

    /** PUT /api/admin/tasks/{id}/audit —— 审核任务（通过/驳回）。 */
    @PutMapping("/tasks/{id}/audit")
    public Result auditTask(@PathVariable int id, @RequestBody AdminAuditDTO dto) {
        adminService.auditTask(id, dto);
        return Result.ok();
    }

    /** DELETE /api/admin/tasks/{id} —— 管理员软删除任务。 */
    @DeleteMapping("/tasks/{id}")
    public Result deleteTask(@PathVariable int id, HttpSession session) {
        adminService.deleteTask(id, currentAdminId(session));
        return Result.ok();
    }

    /** GET /api/admin/products —— 商品列表（含待审核，可按 auditStatus 过滤）。 */
    @GetMapping("/products")
    public Result products(@RequestParam(required = false) String auditStatus,
                           @RequestParam(required = false) String keyword,
                           @RequestParam(defaultValue = "1") int page,
                           @RequestParam(defaultValue = "10") int size) {
        return Result.ok(adminService.listProducts(auditStatus, keyword, page, size));
    }

    /** PUT /api/admin/products/{id}/audit —— 审核商品（通过/驳回）。 */
    @PutMapping("/products/{id}/audit")
    public Result auditProduct(@PathVariable int id, @RequestBody AdminAuditDTO dto) {
        adminService.auditProduct(id, dto);
        return Result.ok();
    }

    /** DELETE /api/admin/products/{id} —— 管理员软删除商品。 */
    @DeleteMapping("/products/{id}")
    public Result deleteProduct(@PathVariable int id, HttpSession session) {
        adminService.deleteProduct(id, currentAdminId(session));
        return Result.ok();
    }

    /** GET /api/admin/users —— 用户列表。 */
    @GetMapping("/users")
    public Result users(@RequestParam(required = false) String keyword,
                        @RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size) {
        return Result.ok(adminService.listUsers(keyword, page, size));
    }

    /** PUT /api/admin/users/{id} —— 编辑用户资料（昵称/联系方式）。 */
    @PutMapping("/users/{id}")
    public Result editUser(@PathVariable int id, @RequestBody Map<String, String> body) {
        adminService.editUser(id, body.get("username"), body.get("qq"), body.get("wechat"), body.get("phone"));
        return Result.ok();
    }

    /** PUT /api/admin/users/{id}/reset-password —— 重置用户密码。 */
    @PutMapping("/users/{id}/reset-password")
    public Result resetPassword(@PathVariable int id, @RequestBody Map<String, String> body) {
        adminService.resetPassword(id, body.get("password"));
        return Result.ok();
    }

    private int currentAdminId(HttpSession session) {
        User user = (User) session.getAttribute("user");
        return user.getId();
    }
}
