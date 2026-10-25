package com.campus.errand.service;

import com.campus.errand.dao.NotificationDAO;
import com.campus.errand.dto.*;
import com.campus.errand.exception.BizException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
public class NotificationService {
    private final NotificationDAO dao;

    public NotificationService(NotificationDAO dao) { this.dao = dao; }

    @Transactional(readOnly = true)
    public NotificationPage list(int userId, String category, String state, int page, int size) {
        if (!Set.of("all", "audit", "order", "termination").contains(category))
            throw new BizException(400, "category 不合法");
        if (!Set.of("all", "unread").contains(state)) throw new BizException(400, "state 不合法");
        if (page < 1 || size < 1 || size > 50) throw new BizException(400, "page 需为正整数，size 需在 1~50 之间");
        var items = dao.list(userId, category, state, page, size);
        long total = dao.count(userId, category, state);
        var counts = dao.counts(userId);
        return new NotificationPage(items, total, page, size, counts.unreadCount(), counts.latestId());
    }

    public NotificationCounts counts(int userId) { return dao.counts(userId); }

    @Transactional
    public Map<String, Object> markRead(long id, int userId) {
        if (id < 1) throw new BizException(400, "消息 ID 需为正整数");
        dao.markRead(id, userId);
        var item = dao.find(id, userId);
        if (item == null) throw new BizException(404, "消息不存在");
        return Map.of("id", item.id(), "read", true, "readAt", item.readAt());
    }

    @Transactional
    public Map<String, Integer> markAll(int userId, NotificationReadAllDTO dto) {
        var id = dto.upToId();
        if (id == null || !id.isIntegralNumber() || !id.canConvertToLong() || id.longValue() < 0)
            throw new BizException(400, "upToId 需为非负 JSON 整数");
        return Map.of("updatedCount", dao.markAll(userId, id.longValue()));
    }

    /** 业务操作与消息写入共用事务；不可从无事务的调用点发送。 */
    @Transactional(propagation = Propagation.MANDATORY)
    public void audit(int recipientId, boolean product, int resourceId, String resourceTitle, boolean approved, String remark) {
        String kind = product ? "商品" : "任务";
        dao.insert(recipientId, approved ? "audit_approved" : "audit_rejected",
                kind + (approved ? "审核已通过" : "审核未通过"),
                "你发布的《" + resourceTitle + "》" + (approved ? "已通过审核。" : "未通过审核。原因：" + remark),
                product ? "product_record" : "task_record", resourceId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void order(int recipientId, boolean product, int orderId, String resourceTitle, String type, String title, String action) {
        dao.insert(recipientId, type, title, "《" + resourceTitle + "》订单 #" + orderId + "：" + action,
                product ? "product_order" : "task_order", orderId);
    }
}
