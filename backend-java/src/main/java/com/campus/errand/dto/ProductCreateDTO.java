package com.campus.errand.dto;

/**
 * 发布商品请求体（契约 §8.2）。
 * sellerId 从 session 取得，不在此 DTO 中。
 */
public class ProductCreateDTO {

    private String title;
    private String description;
    private String category;        // book/electronic/daily/clothing/sports/other，缺省 other
    private String condition;       // new/almost_new/good/fair，缺省 good
    private Double price;           // 非负，缺省 0
    private String location;
    private String contact;
    private String imageUrls;       // 逗号分隔的图片 URL（增量契约：图片功能 §2），选填

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

    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = imageUrls; }
}
