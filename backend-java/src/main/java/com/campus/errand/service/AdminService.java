package com.campus.errand.service;

import com.campus.errand.dao.ProductDAO;
import com.campus.errand.dao.TaskDAO;
import com.campus.errand.dao.UserDAO;
import com.campus.errand.dto.AdminAuditDTO;
import com.campus.errand.dto.PageResult;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Product;
import com.campus.errand.pojo.Task;
import com.campus.errand.pojo.User;
import com.campus.errand.util.PasswordUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

/**
 * 管理员业务逻辑（增量契约：管理员模块）。
 *
 * 只通过 /api/admin/** 暴露，由 AdminInterceptor 保证登录且 role=admin。
 * 审核只改 audit_status / audit_remark，不动业务 status；删除走软删除。
 */
@Service
public class AdminService {

    private static final Set<String> AUDIT_STATUSES = Set.of("pending", "approved", "rejected");

    @Autowired
    private TaskDAO taskDAO;

    @Autowired
    private ProductDAO productDAO;

    @Autowired
    private UserDAO userDAO;

    /** 管理面板统计卡数据。 */
    public Map<String, Object> stats() {
        return Map.of(
                "pendingTasks", taskDAO.countAdminList("pending", null),
                "pendingProducts", productDAO.countAdminList("pending", null),
                "userCount", userDAO.countAll(null),
                "totalTasks", taskDAO.countAdminList(null, null));
    }

    public PageResult<Task> listTasks(String auditStatus, String keyword, int page, int size) {
        validatePage(page, size);
        String status = normalizeAuditStatus(auditStatus);
        int offset = (page - 1) * size;
        return new PageResult<>(
                taskDAO.findAdminList(status, keyword, offset, size),
                taskDAO.countAdminList(status, keyword),
                page, size);
    }

    public void auditTask(int id, AdminAuditDTO dto) {
        if (dto == null || dto.getApprove() == null) {
            throw new BizException(400, "approve 不能为空");
        }
        boolean approve = dto.getApprove();
        String remark = approve ? null : normalizeRejectRemark(dto.getRemark());
        if (taskDAO.audit(id, approve ? "approved" : "rejected", remark) == 0) {
            throw new BizException(404, "任务不存在或已删除");
        }
    }

    public void deleteTask(int id, int adminId) {
        if (taskDAO.softDeleteByAdmin(id, adminId) == 0) {
            throw new BizException(404, "任务不存在或已删除");
        }
    }

    public PageResult<Product> listProducts(String auditStatus, String keyword, int page, int size) {
        validatePage(page, size);
        String status = normalizeAuditStatus(auditStatus);
        int offset = (page - 1) * size;
        return new PageResult<>(
                productDAO.findAdminList(status, keyword, offset, size),
                productDAO.countAdminList(status, keyword),
                page, size);
    }

    public void auditProduct(int id, AdminAuditDTO dto) {
        if (dto == null || dto.getApprove() == null) {
            throw new BizException(400, "approve 不能为空");
        }
        boolean approve = dto.getApprove();
        String remark = approve ? null : normalizeRejectRemark(dto.getRemark());
        if (productDAO.audit(id, approve ? "approved" : "rejected", remark) == 0) {
            throw new BizException(404, "商品不存在或已删除");
        }
    }

    public void deleteProduct(int id, int adminId) {
        if (productDAO.softDeleteByAdmin(id, adminId) == 0) {
            throw new BizException(404, "商品不存在或已删除");
        }
    }

    public PageResult<User> listUsers(String keyword, int page, int size) {
        validatePage(page, size);
        int offset = (page - 1) * size;
        return new PageResult<>(
                userDAO.findAll(keyword, offset, size),
                userDAO.countAll(keyword),
                page, size);
    }

    public void editUser(int id, String username, String qq, String wechat, String phone) {
        requireUser(id);
        if (username == null || username.trim().isEmpty()) {
            throw new BizException(400, "昵称不能为空");
        }
        userDAO.updateProfile(id,
                username.trim(),
                qq == null ? "" : qq.trim(),
                wechat == null ? "" : wechat.trim(),
                phone == null ? "" : phone.trim());
    }

    public void resetPassword(int id, String password) {
        requireUser(id);
        if (password == null || password.length() < 6) {
            throw new BizException(400, "密码至少 6 位");
        }
        userDAO.updatePassword(id, PasswordUtil.generate(password));
    }

    private void requireUser(int id) {
        if (userDAO.findById(id) == null) {
            throw new BizException(404, "用户不存在");
        }
    }

    private String normalizeRejectRemark(String remark) {
        String trimmed = remark == null ? "" : remark.trim();
        if (trimmed.length() < 2 || trimmed.length() > 200) {
            throw new BizException(400, "驳回理由需为 2～200 字");
        }
        return trimmed;
    }

    private String normalizeAuditStatus(String s) {
        if (s == null || s.trim().isEmpty()) {
            return null;
        }
        String v = s.trim();
        if (!AUDIT_STATUSES.contains(v)) {
            throw new BizException(400, "auditStatus 不合法");
        }
        return v;
    }

    private void validatePage(int page, int size) {
        if (page < 1) {
            throw new BizException(400, "page 不能小于 1");
        }
        if (size < 1 || size > 50) {
            throw new BizException(400, "size 需在 1~50 之间");
        }
    }
}
