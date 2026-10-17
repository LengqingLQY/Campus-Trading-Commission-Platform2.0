package com.campus.errand.pojo;

import com.campus.errand.dto.RatingSummary;
import com.fasterxml.jackson.annotation.JsonInclude;

/** 从订单查询历史；不以任务是否已软删除为过滤条件。 */
public class TaskOrderDetail extends TaskOrder {
    private String taskTitle;
    private String publisherName;
    private String accepterName;
    private String viewerRole;
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Integer myRatingStars;
    private RatingSummary counterpartyRating;

    public String getTaskTitle() { return taskTitle; }
    public void setTaskTitle(String taskTitle) { this.taskTitle = taskTitle; }
    public String getPublisherName() { return publisherName; }
    public void setPublisherName(String publisherName) { this.publisherName = publisherName; }
    public String getAccepterName() { return accepterName; }
    public void setAccepterName(String accepterName) { this.accepterName = accepterName; }
    public String getViewerRole() { return viewerRole; }
    public void setViewerRole(String viewerRole) { this.viewerRole = viewerRole; }
    public Integer getMyRatingStars() { return myRatingStars; }
    public void setMyRatingStars(Integer myRatingStars) { this.myRatingStars = myRatingStars; }
    public RatingSummary getCounterpartyRating() { return counterpartyRating; }
    public void setCounterpartyRating(RatingSummary counterpartyRating) { this.counterpartyRating = counterpartyRating; }
}
