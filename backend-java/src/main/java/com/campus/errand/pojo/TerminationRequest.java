package com.campus.errand.pojo;

/**
 * 订单待处理终止申请（增量契约：二手商品软删除确认与订单双向终止 §5.1）。
 *
 * 作为 {@code product_order_termination_request} 表的待处理记录展示字段，
 * 由订单详情 / 个人空间订单项内嵌返回，不单独作为列表资源暴露。
 * {@code requesterRole} 由 Service 根据订单买卖双方计算，不从数据库读取。
 */
public class TerminationRequest {

    private Integer id;
    private String status;          // pending / approved / rejected / withdrawn
    private String requesterRole;   // buyer / seller，由 Service 计算
    private String requesterName;   // 发起方昵称
    private String reason;          // 终止原因，对方可见
    private String createdAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRequesterRole() { return requesterRole; }
    public void setRequesterRole(String requesterRole) { this.requesterRole = requesterRole; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}