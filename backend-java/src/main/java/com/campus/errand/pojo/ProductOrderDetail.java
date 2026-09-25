package com.campus.errand.pojo;

/**
 * 二手订单详情（契约 §8.5）。
 *
 * 由 product_order JOIN product JOIN user（买卖双方）得到，
 * 用于交易页一次性返回商品信息、成交价快照、双方资料与联系方式。
 * {@code viewerRole} 由 Service 根据 session 用户判定后写入，不从数据库读取。
 */
public class ProductOrderDetail {

    private Integer id;
    private Integer productId;
    private String productTitle;
    private String productDescription;
    private String category;
    private String condition;
    private String location;
    private String contact;         // 商品发布时留下的联系方式
    private Double price;           // 成交价快照
    private String status;          // created / delivered / completed / cancelled

    private Integer sellerId;
    private String sellerName;
    private String sellerQq;
    private String sellerWechat;
    private String sellerPhone;

    private Integer buyerId;
    private String buyerName;
    private String buyerQq;
    private String buyerWechat;
    private String buyerPhone;

    private String viewerRole;      // buyer / seller，由 Service 写入
    private String createdAt;
    private String deliveredAt;
    private String finishedAt;
    private String cancelledAt;     // 双方同意终止的时间

    private TerminationRequest terminationRequest;  // 待处理终止申请，无则为 null

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }

    public String getProductTitle() { return productTitle; }
    public void setProductTitle(String productTitle) { this.productTitle = productTitle; }

    public String getProductDescription() { return productDescription; }
    public void setProductDescription(String productDescription) { this.productDescription = productDescription; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSellerId() { return sellerId; }
    public void setSellerId(Integer sellerId) { this.sellerId = sellerId; }

    public String getSellerName() { return sellerName; }
    public void setSellerName(String sellerName) { this.sellerName = sellerName; }

    public String getSellerQq() { return sellerQq; }
    public void setSellerQq(String sellerQq) { this.sellerQq = sellerQq; }

    public String getSellerWechat() { return sellerWechat; }
    public void setSellerWechat(String sellerWechat) { this.sellerWechat = sellerWechat; }

    public String getSellerPhone() { return sellerPhone; }
    public void setSellerPhone(String sellerPhone) { this.sellerPhone = sellerPhone; }

    public Integer getBuyerId() { return buyerId; }
    public void setBuyerId(Integer buyerId) { this.buyerId = buyerId; }

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }

    public String getBuyerQq() { return buyerQq; }
    public void setBuyerQq(String buyerQq) { this.buyerQq = buyerQq; }

    public String getBuyerWechat() { return buyerWechat; }
    public void setBuyerWechat(String buyerWechat) { this.buyerWechat = buyerWechat; }

    public String getBuyerPhone() { return buyerPhone; }
    public void setBuyerPhone(String buyerPhone) { this.buyerPhone = buyerPhone; }

    public String getViewerRole() { return viewerRole; }
    public void setViewerRole(String viewerRole) { this.viewerRole = viewerRole; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(String deliveredAt) { this.deliveredAt = deliveredAt; }

    public String getFinishedAt() { return finishedAt; }
    public void setFinishedAt(String finishedAt) { this.finishedAt = finishedAt; }

    public String getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(String cancelledAt) { this.cancelledAt = cancelledAt; }

    public TerminationRequest getTerminationRequest() { return terminationRequest; }
    public void setTerminationRequest(TerminationRequest terminationRequest) { this.terminationRequest = terminationRequest; }
}