package com.campus.errand.dto;

/**
 * 发表评论/回复请求体（增量契约：商品与跑腿详情评论及修改 §3.2）。
 * authorId 从 session 取得，不在此 DTO 中。
 */
public class CommentCreateDTO {

    private String content;
    private Integer replyToId;   // null/省略=新评论，正整数=回复的父评论 id

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Integer getReplyToId() { return replyToId; }
    public void setReplyToId(Integer replyToId) { this.replyToId = replyToId; }
}
