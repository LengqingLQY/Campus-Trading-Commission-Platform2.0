package com.campus.errand.pojo;

/**
 * 对应 product 表，字段与《数据库设计说明书》§4.3 一一对应。
 *
 * 展示字段（JOIN 得到，非 product 列）：
 *   sellerName              列表/详情：卖家昵称（JOIN user）
 *   orderId/orderStatus     个人空间：购买记录 id 与状态（JOIN product_order）
 *   buyerId/buyerName       个人空间 published：买家 id 与昵称
 *   dealPrice/buyTime       个人空间：成交价快照与购买时间
 */
public class Product {

    private Integer id;
    private Integer sellerId;
    private String title;
    private String description;
    private String category;        // book/electronic/daily/clothing/sports/other
    private String condition;       // new/almost_new/good/fair
    private Double price;
    private String location;
    private String contact;
    private String auditStatus;
    private String auditRemark;
    private String status;          // on_sale / sold / completed
    private Integer isDeleted;
    private Integer deletedBy;
    private String deletedAt;
    private String createdAt;
    private String updatedAt;

    // ---- 展示字段（JOIN 得到，非 product 列） ----
    private String sellerName;
    private Integer orderId;
    private String orderStatus;
    private Integer buyerId;
    private String buyerName;
    private Double dealPrice;
    private String buyTime;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getSellerId() { return sellerId; }
    public void setSellerId(Integer sellerId) { this.sellerId = sellerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

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

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    public Integer getOrderId() { return orderId; }
    public void setOrderId(Integer orderId) { this.orderId = orderId; }

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public Integer getBuyerId() { return buyerId; }
    public void setBuyerId(Integer buyerId) { this.buyerId = buyerId; }

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }

    public Double getDealPrice() { return dealPrice; }
    public void setDealPrice(Double dealPrice) { this.dealPrice = dealPrice; }

    public String getBuyTime() { return buyTime; }
    public void setBuyTime(String buyTime) { this.buyTime = buyTime; }
}
