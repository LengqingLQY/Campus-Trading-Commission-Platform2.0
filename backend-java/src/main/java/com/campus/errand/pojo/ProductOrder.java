package com.campus.errand.pojo;

/**
 * 对应 product_order 表（购买记录）。
 * 字段与《数据库设计说明书》§4.5 一一对应。
 */
public class ProductOrder {

    private Integer id;
    private Integer productId;
    private Integer sellerId;
    private Integer buyerId;
    private Double price;           // 成交价快照，卖家改价不影响历史记录
    private String status;          // created / delivered / completed / cancelled
    private String createdAt;
    private String deliveredAt;     // 卖家点「确认已交付」的时间
    private String finishedAt;      // 买家点「确认收货」的时间
    private String cancelledAt;     // 双方同意终止的时间

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }

    public Integer getSellerId() { return sellerId; }
    public void setSellerId(Integer sellerId) { this.sellerId = sellerId; }

    public Integer getBuyerId() { return buyerId; }
    public void setBuyerId(Integer buyerId) { this.buyerId = buyerId; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(String deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getFinishedAt() { return finishedAt; }
    public void setFinishedAt(String finishedAt) { this.finishedAt = finishedAt; }

    public String getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(String cancelledAt) { this.cancelledAt = cancelledAt; }
}
