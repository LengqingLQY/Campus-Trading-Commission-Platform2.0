package com.campus.errand.pojo;

/**
 * 对应 task 表，字段与《数据库设计说明书》§4.2 一一对应（下划线转驼峰）。
 *
 * 除表字段外，另有一组「展示字段」，由列表/详情/个人空间查询 JOIN 出来，
 * 并非 task 表的列，SQL 中通过别名（如 AS publisherName）由 BeanPropertyRowMapper 自动映射：
 *   publisherName          列表/详情：发布者昵称（JOIN user）
 *   orderId/orderStatus    个人空间：接单记录 id 与状态（JOIN task_order）
 *   accepterId/accepterName 个人空间：接单人 id 与昵称
 *   acceptTime/deliveredAt/finishedAt 个人空间 accepted：接单/送达/完成时间
 */
public class Task {

    private Integer id;
    private Integer publisherId;
    private String title;
    private String description;
    private String pickup;
    private String delivery;
    private String deadline;
    private Double amount;
    private String contact;
    private String imageUrls;       // 逗号分隔的图片 URL（增量契约：图片功能 §2）
    private String auditStatus;
    private String auditRemark;
    private String status;          // open / accepted / delivered / completed
    private Integer isDeleted;      // 0/1
    private Integer deletedBy;
    private String deletedAt;
    private String createdAt;
    private String updatedAt;

    // ---- 展示字段（JOIN 得到，非 task 列） ----
    private String publisherName;
    private Integer orderId;
    private String orderStatus;
    private Integer accepterId;
    private String accepterName;
    private String acceptTime;
    private String deliveredAt;
    private String finishedAt;
    private TaskTerminationRequest terminationRequest;  // 进行中任务的待处理终止申请，无则 null

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getPublisherId() { return publisherId; }
    public void setPublisherId(Integer publisherId) { this.publisherId = publisherId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPickup() { return pickup; }
    public void setPickup(String pickup) { this.pickup = pickup; }

    public String getDelivery() { return delivery; }
    public void setDelivery(String delivery) { this.delivery = delivery; }

    public String getDeadline() { return deadline; }
    public void setDeadline(String deadline) { this.deadline = deadline; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = imageUrls; }

    public String getAuditStatus() { return auditStatus; }
    public void setAuditStatus(String auditStatus) { this.auditStatus = auditStatus; }

    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Integer isDeleted) { this.isDeleted = isDeleted; }

    public Integer getDeletedBy() { return deletedBy; }
    public void setDeletedBy(Integer deletedBy) { this.deletedBy = deletedBy; }

    public String getDeletedAt() { return deletedAt; }
    public void setDeletedAt(String deletedAt) { this.deletedAt = deletedAt; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public String getPublisherName() { return publisherName; }
    public void setPublisherName(String publisherName) { this.publisherName = publisherName; }

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public Integer getAccepterId() { return accepterId; }
    public void setAccepterId(Integer accepterId) { this.accepterId = accepterId; }

    public String getAccepterName() { return accepterName; }
    public void setAccepterName(String accepterName) { this.accepterName = accepterName; }

    public String getAcceptTime() { return acceptTime; }
    public void setAcceptTime(String acceptTime) { this.acceptTime = acceptTime; }

    public String getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(String deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getFinishedAt() { return finishedAt; }
    public void setFinishedAt(String finishedAt) { this.finishedAt = finishedAt; }

    public TaskTerminationRequest getTerminationRequest() { return terminationRequest; }
    public void setTerminationRequest(TaskTerminationRequest terminationRequest) { this.terminationRequest = terminationRequest; }
}
