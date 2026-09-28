package com.campus.errand.service;

import com.campus.errand.dao.CommentDAO;
import com.campus.errand.dao.ProductDAO;
import com.campus.errand.dao.TaskDAO;
import com.campus.errand.dto.CommentCreateDTO;
import com.campus.errand.dto.PageResult;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.Comment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * 评论业务逻辑（商品与任务通用，resourceType 取值 'product' / 'task'）。
 */
@Service
public class CommentService {

    @Autowired
    private CommentDAO commentDAO;

    @Autowired
    private ProductDAO productDAO;

    @Autowired
    private TaskDAO taskDAO;

    /**
     * 分页读取评论（公开）。size 固定 10。
     */
    public PageResult<Comment> list(String resourceType, int resourceId, int page, int size) {
        if (page < 1) {
            throw new BizException(400, "page 不能小于 1");
        }
        if (size != 10) {
            throw new BizException(400, "size 必须为 10");
        }
        requireVisibleResource(resourceType, resourceId);
        int offset = (page - 1) * size;
        return new PageResult<>(
                commentDAO.findPage(resourceType, resourceId, offset, size),
                commentDAO.count(resourceType, resourceId),
                page, size);
    }

    /**
     * 发表评论/回复。返回 {id, page}，page 为新评论按「时间正序、id 正序、每页 10 条」所在页。
     */
    public Map<String, Object> create(String resourceType, int resourceId, int authorId, CommentCreateDTO dto) {
        String content = dto.getContent() == null ? "" : dto.getContent().trim();
        if (content.isEmpty() || content.length() > 1000) {
            throw new BizException(400, "评论内容需为 1～1000 字");
        }
        requireVisibleResource(resourceType, resourceId);

        Integer replyToId = dto.getReplyToId();
        if (replyToId != null) {
            if (replyToId <= 0) {
                throw new BizException(400, "replyToId 不合法");
            }
            Comment parent = commentDAO.findById(replyToId);
            if (parent == null || (parent.getIsDeleted() != null && parent.getIsDeleted() == 1)
                    || !resourceType.equals(parent.getResourceType())
                    || !Integer.valueOf(resourceId).equals(parent.getResourceId())) {
                throw new BizException(409, "回复的评论不存在或已删除");
            }
        }

        int id = commentDAO.insert(resourceType, resourceId, authorId, replyToId, content);
        long total = commentDAO.count(resourceType, resourceId);
        int page = (int) ((total + 9) / 10);
        return Map.of("id", id, "page", page);
    }

    /**
     * 删除本人评论（软删除，保留回复）。
     */
    public void delete(String resourceType, int resourceId, int commentId, int authorId) {
        Comment comment = commentDAO.findById(commentId);
        if (comment == null || (comment.getIsDeleted() != null && comment.getIsDeleted() == 1)) {
            throw new BizException(404, "评论不存在");
        }
        if (!resourceType.equals(comment.getResourceType())
                || !Integer.valueOf(resourceId).equals(comment.getResourceId())) {
            throw new BizException(404, "评论不存在");
        }
        if (comment.getAuthorId() == null || comment.getAuthorId() != authorId) {
            throw new BizException(403, "只能删除自己的评论");
        }
        if (commentDAO.softDelete(commentId, authorId) == 0) {
            // 并发下已被删除
            throw new BizException(404, "评论不存在");
        }
    }

    /** 资源必须公开可见（商品在售，任务未完成）。 */
    private void requireVisibleResource(String resourceType, int resourceId) {
        boolean visible = "product".equals(resourceType)
                ? productDAO.findPublicDetail(resourceId) != null
                : taskDAO.findPublicDetail(resourceId) != null;
        if (!visible) {
            throw new BizException(404, "内容不存在");
        }
    }
}
