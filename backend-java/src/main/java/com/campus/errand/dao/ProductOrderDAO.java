package com.campus.errand.dao;

import com.campus.errand.pojo.ProductOrder;
import com.campus.errand.pojo.ProductOrderDetail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

/**
 * 购买记录表（product_order）数据访问。
 */
@Repository
public class ProductOrderDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 按商品查最新一条未终止订单。查不到返回 null。
     * 商品终止后可再次售出，故同一商品可能有多条历史订单，此处只取非 cancelled 的最新一条
     * （增量契约：二手商品软删除确认与订单双向终止 §4.3）。
     */
    public ProductOrder findByProductId(int productId) {
        String sql = "SELECT * FROM product_order WHERE product_id = ? AND status <> 'cancelled' "
                + "ORDER BY created_at DESC, id DESC LIMIT 1";
        List<ProductOrder> list = jdbc.query(sql, new BeanPropertyRowMapper<>(ProductOrder.class), productId);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 按订单 id 查购买记录。查不到返回 null。
     */
    public ProductOrder findById(int id) {
        String sql = "SELECT * FROM product_order WHERE id = ?";
        List<ProductOrder> list = jdbc.query(sql, new BeanPropertyRowMapper<>(ProductOrder.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 订单详情：联表取商品信息、成交价快照与买卖双方资料，供交易页一次渲染。
     * viewerRole 不在 SQL 里算，由 Service 根据 session 判定后写入。
     */
    public ProductOrderDetail findDetail(int orderId) {
        String sql = "SELECT o.id, o.product_id AS productId, o.seller_id AS sellerId, o.buyer_id AS buyerId, "
                + "o.price, o.status, o.created_at AS createdAt, o.delivered_at AS deliveredAt, o.finished_at AS finishedAt, "
                + "o.cancelled_at AS cancelledAt, "
                + "p.title AS productTitle, p.description AS productDescription, p.category, p.condition, "
                + "p.location, p.contact, "
                + "su.username AS sellerName, su.qq AS sellerQq, su.wechat AS sellerWechat, su.phone AS sellerPhone, "
                + "bu.username AS buyerName, bu.qq AS buyerQq, bu.wechat AS buyerWechat, bu.phone AS buyerPhone "
                + "FROM product_order o "
                + "JOIN product p ON p.id = o.product_id "
                + "JOIN user su ON su.id = o.seller_id "
                + "JOIN user bu ON bu.id = o.buyer_id "
                + "WHERE o.id = ?";
        List<ProductOrderDetail> list = jdbc.query(sql, new BeanPropertyRowMapper<>(ProductOrderDetail.class), orderId);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 插入购买记录，status 固定 created，price 存成交价快照。返回自增主键 id。
     */
    public int insert(int productId, int sellerId, int buyerId, double price) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO product_order (product_id, seller_id, buyer_id, price, status) "
                  + "VALUES (?, ?, ?, ?, 'created')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, productId);
            ps.setInt(2, sellerId);
            ps.setInt(3, buyerId);
            ps.setDouble(4, price);
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 卖家确认交付：仅本人、且状态为 created 时更新，写 delivered_at。
     * 返回受影响行数（0 = 非本人 / 状态不允许）。
     */
    public int markDelivered(int orderId, int sellerId) {
        return jdbc.update(
                "UPDATE product_order SET status='delivered', delivered_at=datetime('now','localtime') "
              + "WHERE id=? AND seller_id=? AND status='created'",
                orderId, sellerId);
    }

    /**
     * 买家确认收货：仅本人、且状态为 delivered 时更新，写 finished_at。
     * 返回受影响行数（0 = 非本人 / 状态不允许）。
     */
    public int markCompleted(int orderId, int buyerId) {
        return jdbc.update(
                "UPDATE product_order SET status='completed', finished_at=datetime('now','localtime') "
              + "WHERE id=? AND buyer_id=? AND status='delivered'",
                orderId, buyerId);
    }

    /**
     * 双方同意终止：created/delivered -> cancelled，写 cancelled_at。
     * 返回受影响行数（0 = 订单已不在可终止状态，应由上层回滚并返回 409）。
     */
    public int markCancelled(int orderId) {
        return jdbc.update(
                "UPDATE product_order SET status='cancelled', cancelled_at=datetime('now','localtime') "
              + "WHERE id=? AND status IN ('created','delivered')",
                orderId);
    }
}
