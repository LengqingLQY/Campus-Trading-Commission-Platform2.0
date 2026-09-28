package com.campus.errand.pojo;

/**
 * 对应 comment 表，商品与任务的评论/回复（增量契约：商品与跑腿详情评论及修改 §3）。
 *
 * 对外返回字段：id / authorId / authorName / content / createdAt / replyTo。
 * resourceType / resourceId / replyToId / isDeleted 等表字段仅 Service/DAO 内部校验使用；
 * 列表查询用自定义 RowMapper 组装，不填充这些内部字段，配合全局 non_null 序列化不会返回给前端。
 */
public class Comment {

    private Integer id;
    private String resourceType;   // 'product' / 'task'（内部）
    private Integer resourceId;    // 内部
    private Integer authorId;
    private String authorName;     // JOIN user
    private Integer replyToId;     // 内部
    private String content;
    private Integer isDeleted;     // 内部
    private Integer deletedBy;     // 内部
    private String deletedAt;      // 内部
    private String createdAt;
    private ReplyTo replyTo;       // 对外：所回复的父评论引用

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getResourceType() { return resourceType; }
    public void setResourceType(String resourceType) { this.resourceType = resourceType; }

    public Integer getResourceId() { return resourceId; }
    public void setResourceId(Integer resourceId) { this.resourceId = resourceId; }

    public Integer getAuthorId() { return authorId; }
    public void setAuthorId(Integer authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public Integer getReplyToId() { return replyToId; }
    public void setReplyToId(Integer replyToId) { this.replyToId = replyToId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Integer getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Integer isDeleted) { this.isDeleted = isDeleted; }

    public Integer getDeletedBy() { return deletedBy; }
    public void setDeletedBy(Integer deletedBy) { this.deletedBy = deletedBy; }

    public String getDeletedAt() { return deletedAt; }
    public void setDeletedAt(String deletedAt) { this.deletedAt = deletedAt; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public ReplyTo getReplyTo() { return replyTo; }
    public void setReplyTo(ReplyTo replyTo) { this.replyTo = replyTo; }

    /**
     * 所回复的父评论引用。父评论被删除时仅返回 id + deleted=true，省略正文。
     */
    public static class ReplyTo {
        private Integer id;
        private String authorName;
        private String content;      // 截断至 160 字
        private boolean deleted;

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }

        public String getAuthorName() { return authorName; }
        public void setAuthorName(String authorName) { this.authorName = authorName; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public boolean getDeleted() { return deleted; }
        public void setDeleted(boolean deleted) { this.deleted = deleted; }
    }
}
