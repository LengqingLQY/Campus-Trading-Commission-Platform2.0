package com.campus.errand.dao;

import com.campus.errand.pojo.ProductOrder;
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
     * 按商品查购买记录。查不到返回 null。
     */
    public ProductOrder findByProductId(int productId) {
        String sql = "SELECT * FROM product_order WHERE product_id = ?";
        List<ProductOrder> list = jdbc.query(sql, new BeanPropertyRowMapper<>(ProductOrder.class), productId);
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
}
