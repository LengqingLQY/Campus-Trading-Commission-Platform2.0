package com.campus.errand.dto;

/**
 * 发布任务请求体（契约 §7.2）。
 * publisherId 从 session 取得，不在此 DTO 中。
 */
public class TaskCreateDTO {

    private String title;
    private String description;
    private String pickup;
    private String delivery;
    private String deadline;        // null 或 'YYYY-MM-DD HH:MM:SS'
    private Double amount;          // 非负，缺省 0
    private String contact;

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
}
