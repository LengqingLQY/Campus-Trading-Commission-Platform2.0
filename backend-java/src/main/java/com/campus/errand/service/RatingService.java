package com.campus.errand.service;

import com.campus.errand.dao.*;
import com.campus.errand.dto.*;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RatingService {
    private final RatingDAO ratingDAO;
    private final ProductOrderDAO productOrderDAO;
    private final TaskOrderDAO taskOrderDAO;
    private final UserDAO userDAO;

    public RatingService(RatingDAO ratingDAO, ProductOrderDAO productOrderDAO,
                         TaskOrderDAO taskOrderDAO, UserDAO userDAO) {
        this.ratingDAO = ratingDAO;
        this.productOrderDAO = productOrderDAO;
        this.taskOrderDAO = taskOrderDAO;
        this.userDAO = userDAO;
    }

    @Transactional
    public RatingReceipt rateProduct(int orderId, int userId, RatingCreateDTO dto) {
        RatingReceipt receipt = ratingDAO.insertProduct(orderId, userId, stars(dto));
        if (receipt != null) return receipt;
        ProductOrder order = productOrderDAO.findById(orderId);
        if (order == null) throw new BizException(404, "订单不存在");
        checkParticipant(userId, order.getBuyerId(), order.getSellerId());
        throw conflict(order.getStatus());
    }

    @Transactional
    public RatingReceipt rateTask(int orderId, int userId, RatingCreateDTO dto) {
        RatingReceipt receipt = ratingDAO.insertTask(orderId, userId, stars(dto));
        if (receipt != null) return receipt;
        TaskOrder order = taskOrderDAO.findById(orderId);
        if (order == null) throw new BizException(404, "订单不存在");
        checkParticipant(userId, order.getPublisherId(), order.getAccepterId());
        throw conflict(order.getStatus());
    }

    private int stars(RatingCreateDTO dto) {
        var value = dto.stars();
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() < 1 || value.intValue() > 5) {
            throw new BizException(400, "评分必须是 1～5 的 JSON 整数");
        }
        return value.intValue();
    }

    private BizException conflict(String status) {
        return new BizException(409, "completed".equals(status) ? "本订单已评价，不能重复提交" : "订单完成后才能评价");
    }

    private void checkParticipant(int userId, int firstId, int secondId) {
        if (userId != firstId && userId != secondId) throw new BizException(403, "仅订单双方可以访问");
    }

    public PublicUserRating publicRating(int userId) {
        User user = userDAO.findById(userId);
        if (user == null) throw new BizException(404, "用户不存在");
        return new PublicUserRating(userId, user.getUsername(), user.getAvatarUrl(),
                ratingDAO.summary(userId, "buyer"), ratingDAO.summary(userId, "seller"));
    }

    public void enrichProductOrder(ProductOrderDetail detail, int userId) {
        boolean isBuyer = "buyer".equals(detail.getViewerRole());
        detail.setMyRatingStars(ratingDAO.myStars("product", detail.getId(), userId));
        detail.setCounterpartyRating(ratingDAO.summary(isBuyer ? detail.getSellerId() : detail.getBuyerId(),
                isBuyer ? "seller" : "buyer"));
    }

    public TaskOrderDetail taskOrder(int orderId, int userId) {
        TaskOrderDetail detail = taskOrderDAO.findDetail(orderId);
        if (detail == null) throw new BizException(404, "订单不存在");
        checkParticipant(userId, detail.getPublisherId(), detail.getAccepterId());
        boolean isPublisher = detail.getPublisherId() == userId;
        detail.setViewerRole(isPublisher ? "publisher" : "accepter");
        detail.setMyRatingStars(ratingDAO.myStars("task", orderId, userId));
        detail.setCounterpartyRating(ratingDAO.summary(isPublisher ? detail.getAccepterId() : detail.getPublisherId(),
                isPublisher ? "seller" : "buyer"));
        return detail;
    }

    public PageResult<RatingOrderItem> orders(int userId, String state, int page, int size) {
        if (!"all".equals(state) && !"pending".equals(state)) throw new BizException(400, "state 需为 all 或 pending");
        if (page < 1 || size < 1 || size > 50 || page > Integer.MAX_VALUE / size) {
            throw new BizException(400, "page 需为正整数，size 需在 1～50 之间");
        }
        return new PageResult<>(ratingDAO.orders(userId, state, (page - 1) * size, size),
                ratingDAO.countOrders(userId, state), page, size);
    }
}
