package com.campus.errand.pojo;

/**
 * 对应 task_order 表（跑腿记录：谁接了哪条任务）。
 * 字段与《数据库设计说明书》§4.4 一一对应。
 */
public class TaskOrder {

    private Integer id;
    private Integer taskId;
    private Integer publisherId;
    private Integer accepterId;
    private String status;          // accepted / delivered / completed / cancelled
    private String createdAt;
    private String deliveredAt;
    private String finishedAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getTaskId() { return taskId; }
    public void setTaskId(Integer taskId) { this.taskId = taskId; }

    public Integer getPublisherId() { return publisherId; }
    public void setPublisherId(Integer publisherId) { this.publisherId = publisherId; }

    public Integer getAccepterId() { return accepterId; }
    public void setAccepterId(Integer accepterId) { this.accepterId = accepterId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(String deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getFinishedAt() { return finishedAt; }
    public void setFinishedAt(String finishedAt) { this.finishedAt = finishedAt; }
}
