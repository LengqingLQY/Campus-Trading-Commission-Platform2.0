package com.campus.errand.service;

import com.campus.errand.dao.TaskDAO;
import com.campus.errand.dao.TaskOrderDAO;
import com.campus.errand.dto.PageResult;
import com.campus.errand.dto.TaskCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Task;
import com.campus.errand.pojo.TaskOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Map;

/**
 * 跑腿任务业务逻辑。事务边界、状态流转、权限校验都在这一层。
 */
@Service
public class TaskService {

    /** 排序白名单：非法值按默认 time_desc 处理（设计说明书 §5.3）。 */
    private static final Map<String, String> TASK_ORDER = Map.of(
            "time_desc",   "t.created_at DESC",
            "time_asc",    "t.created_at ASC",
            "amount_desc", "t.amount DESC",
            "amount_asc",  "t.amount ASC"
    );

    @Autowired
    private TaskDAO taskDAO;

    @Autowired
    private TaskOrderDAO taskOrderDAO;

    /**
     * 公开任务列表（关键词 + 排序 + 分页）。
     */
    public PageResult<Task> listTasks(String keyword, String sort, int page, int size) {
        if (page < 1) {
            throw new BizException(400, "page 不能小于 1");
        }
        if (size < 1 || size > 50) {
            throw new BizException(400, "size 需在 1~50 之间");
        }
        String orderBy = TASK_ORDER.getOrDefault(sort, "t.created_at DESC");
        int offset = (page - 1) * size;
        return new PageResult<>(
                taskDAO.findPublic(keyword, orderBy, offset, size),
                taskDAO.countPublic(keyword),
                page, size);
    }

    /**
     * 任务详情。发布者本人额外返回 auditStatus/auditRemark，其他请求者不返回审核字段。
     */
    public Task getTask(int id, Integer currentUserId) {
        Task task = taskDAO.findPublicDetail(id);
        if (task == null) {
            throw new BizException(404, "任务不存在");
        }
        if (currentUserId == null || !currentUserId.equals(task.getPublisherId())) {
            task.setAuditStatus(null);
            task.setAuditRemark(null);
        }
        return task;
    }

    /**
     * 发布任务。publisherId 从 session 取得，落库 audit_status='approved'、status='open'。
     */
    public int createTask(TaskCreateDTO dto, int publisherId) {
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new BizException(400, "标题不能为空");
        }
        if (dto.getPickup() == null || dto.getPickup().trim().isEmpty()) {
            throw new BizException(400, "取件地点不能为空");
        }
        if (dto.getDelivery() == null || dto.getDelivery().trim().isEmpty()) {
            throw new BizException(400, "送达地点不能为空");
        }

        Double amount = dto.getAmount();
        if (amount != null && amount < 0) {
            throw new BizException(400, "金额不能为负数");
        }
        String deadline = dto.getDeadline();
        if (deadline != null && !deadline.isEmpty() && !isValidTime(deadline)) {
            throw new BizException(400, "截止时间格式不正确");
        }

        Task task = new Task();
        task.setPublisherId(publisherId);
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription() == null ? "" : dto.getDescription());
        task.setPickup(dto.getPickup());
        task.setDelivery(dto.getDelivery());
        task.setDeadline(deadline);
        task.setAmount(amount == null ? 0.0 : amount);
        task.setContact(dto.getContact() == null ? "" : dto.getContact());
        return taskDAO.insert(task);
    }

    /**
     * 接取任务（三层防护，事务内）：
     * ① 业务校验：任务公开可见、非自己发布；② 状态写入 UPDATE 的 WHERE；
     * ③ 数据库 UNIQUE(task_id)/CHECK 兜底。
     */
    @Transactional
    public int acceptTask(int taskId, int currentUserId) {
        Task task = taskDAO.findById(taskId);
        if (task == null || (task.getIsDeleted() != null && task.getIsDeleted() == 1)
                || !"approved".equals(task.getAuditStatus())) {
            throw new BizException(404, "任务不存在");
        }
        if (task.getPublisherId() != null && task.getPublisherId() == currentUserId) {
            throw new BizException(403, "不能接取自己发布的任务");
        }

        int rows = taskDAO.accept(taskId);
        if (rows == 0) {
            throw new BizException(409, "任务已被接取");
        }
        return taskOrderDAO.insert(taskId, task.getPublisherId(), currentUserId);
    }

    /**
     * 接单方标记已送达（事务内同时更新 task 与 task_order）。
     */
    @Transactional
    public void deliverTask(int taskId, int currentUserId) {
        Task task = taskDAO.findById(taskId);
        if (task == null || (task.getIsDeleted() != null && task.getIsDeleted() == 1)
                || !"approved".equals(task.getAuditStatus())) {
            throw new BizException(404, "任务不存在");
        }
        TaskOrder order = taskOrderDAO.findByTaskId(taskId);
        if (order == null) {
            throw new BizException(409, "任务尚未被接取");
        }
        if (order.getAccepterId() == null || order.getAccepterId() != currentUserId) {
            throw new BizException(403, "只有接单方可以标记送达");
        }

        int rows = taskOrderDAO.markDelivered(taskId, currentUserId);
        if (rows == 0) {
            throw new BizException(409, "当前状态不允许该操作");
        }
        taskDAO.markDelivered(taskId);
    }

    /**
     * 发布者确认完成（允许从 accepted 或 delivered 一步直达，兼容简化闭环）。
     */
    @Transactional
    public void completeTask(int taskId, int currentUserId) {
        Task task = taskDAO.findById(taskId);
        if (task == null || (task.getIsDeleted() != null && task.getIsDeleted() == 1)
                || !"approved".equals(task.getAuditStatus())) {
            throw new BizException(404, "任务不存在");
        }
        if (task.getPublisherId() == null || task.getPublisherId() != currentUserId) {
            throw new BizException(403, "只有发布者可以确认完成");
        }
        if (taskOrderDAO.findByTaskId(taskId) == null) {
            throw new BizException(409, "任务尚未被接取");
        }

        int rows = taskOrderDAO.markCompleted(taskId, currentUserId);
        if (rows == 0) {
            throw new BizException(409, "当前状态不允许该操作");
        }
        taskDAO.markCompleted(taskId);
    }

    /**
     * 个人空间：我的任务。type=published（默认）/accepted，非法值返回 400。
     */
    public PageResult<Task> myTasks(int userId, String type, int page, int size) {
        if (page < 1) {
            throw new BizException(400, "page 不能小于 1");
        }
        if (size < 1 || size > 50) {
            throw new BizException(400, "size 需在 1~50 之间");
        }
        int offset = (page - 1) * size;
        String t = type == null ? "published" : type;
        if ("published".equals(t)) {
            return new PageResult<>(
                    taskDAO.findPublishedByUser(userId, offset, size),
                    taskDAO.countPublishedByUser(userId), page, size);
        }
        if ("accepted".equals(t)) {
            return new PageResult<>(
                    taskDAO.findAcceptedByUser(userId, offset, size),
                    taskDAO.countAcceptedByUser(userId), page, size);
        }
        throw new BizException(400, "type 不合法");
    }

    private static boolean isValidTime(String s) {
        try {
            LocalDateTime.parse(s.replace(' ', 'T'));
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }
}
