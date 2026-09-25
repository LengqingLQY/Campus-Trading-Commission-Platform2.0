package com.campus.errand.pojo;

/**
 * 跑腿任务待处理终止申请（增量契约：跑腿任务删除与双向终止 §5）。
 *
 * 作为 {@code task_termination_request} 表的待处理记录展示字段，
 * 由任务详情 / 个人空间任务项内嵌返回，不单独作为列表资源暴露。
 * {@code requesterId} 直接来自表列，前端据此判断「发起方 / 另一方」。
 */
public class TaskTerminationRequest {

    private Integer id;
    private Integer requesterId;   // 发起方用户 id
    private String requesterName;  // 发起方昵称
    private String reason;         // 终止原因，对方可见
    private String status;         // pending / approved / rejected / withdrawn
    private String createdAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getRequesterId() { return requesterId; }
    public void setRequesterId(Integer requesterId) { this.requesterId = requesterId; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}