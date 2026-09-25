package com.campus.errand.dao;

import com.campus.errand.pojo.Product;
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
 * 二手商品表数据访问。
 *
 * 公开查询一律走 v_public_product 视图（已过滤 audit_status='approved' AND is_deleted=0）。
 */
@Repository
public class ProductDAO {

    @Autowired
    private JdbcTemplate jdbc;

    public List<Product> findPublic(String keyword, String orderBy, int offset, int size) {
        String p = likePattern(keyword);
        String sql = "SELECT t.id, t.title, t.description, t.category, t.condition, t.price, "
                + "t.image_urls, t.location, t.status, t.seller_id, t.created_at, u.username AS sellerName "
                + "FROM v_public_product t JOIN user u ON u.id = t.seller_id "
                + "WHERE t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\' "
                + "ORDER BY " + orderBy + " LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class), p, p, size, offset);
    }

    public long countPublic(String keyword) {
        String p = likePattern(keyword);
        String sql = "SELECT COUNT(*) FROM v_public_product t "
                + "WHERE t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\'";
        Long count = jdbc.queryForObject(sql, Long.class, p, p);
        return count == null ? 0 : count;
    }

    public Product findPublicDetail(int id) {
        String sql = "SELECT t.id, t.title, t.description, t.category, t.condition, t.price, "
                + "t.image_urls, t.location, t.contact, t.audit_status, t.audit_remark, t.status, t.seller_id, "
                + "t.created_at, t.updated_at, u.username AS sellerName "
                + "FROM v_public_product t JOIN user u ON u.id = t.seller_id WHERE t.id = ?";
        List<Product> list = jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    public Product findById(int id) {
        String sql = "SELECT * FROM product WHERE id = ?";
        List<Product> list = jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class), id);
        return list.isEmpty() ? null : list.get(0);
    }

    /**
     * 发布商品：audit_status 固定 pending（待管理员审核）、status 固定 on_sale。返回自增主键 id。
     */
    public int insert(Product product) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO product (seller_id, title, description, category, condition, price, location, contact, image_urls, audit_status, status) "
                  + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'on_sale')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, product.getSellerId());
            ps.setString(2, product.getTitle());
            ps.setString(3, product.getDescription());
            ps.setString(4, product.getCategory());
            ps.setString(5, product.getCondition());
            ps.setDouble(6, product.getPrice());
            ps.setString(7, product.getLocation());
            ps.setString(8, product.getContact());
            ps.setString(9, product.getImageUrls());
            return ps;
        }, keyHolder);
        Number key = keyHolder.getKey();
        return key == null ? 0 : key.intValue();
    }

    /**
     * 购买：状态判断写入 WHERE，返回受影响行数（0 = 已售出 / 不可买）。
     */
    public int markSold(int productId) {
        return jdbc.update(
                "UPDATE product SET status='sold', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status='on_sale' AND audit_status='approved' AND is_deleted=0",
                productId);
    }

    /**
     * 买家确认收货后，商品随订单一起完成（sold -> completed）。
     */
    public int markCompleted(int productId) {
        return jdbc.update(
                "UPDATE product SET status='completed', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status='sold'",
                productId);
    }

    /**
     * 终止订单生效后，商品恢复待售（sold -> on_sale）。
     * 返回受影响行数（0 = 商品已不在售出状态）。
     */
    public int markOnSale(int productId) {
        return jdbc.update(
                "UPDATE product SET status='on_sale', updated_at=datetime('now','localtime') "
              + "WHERE id=? AND status='sold'",
                productId);
    }

    /**
     * 发布者软删除：仅在本人、未删除、且状态非 sold 时置 is_deleted=1。
     * 返回受影响行数（0 = 非本人 / 已删除 / 交易进行中，由 Service 二次判断返回精确错误码）。
     */
    public int softDelete(int productId, int sellerId) {
        return jdbc.update(
                "UPDATE product SET is_deleted=1, deleted_by=?, "
              + "deleted_at=datetime('now','localtime'), updated_at=datetime('now','localtime') "
              + "WHERE id=? AND seller_id=? AND is_deleted=0 AND status IN ('on_sale','completed')",
                sellerId, productId, sellerId);
    }

    /** 个人空间：我发布的商品（已售出时附买家与成交信息）。 */
    public List<Product> findPublishedByUser(int sellerId, int offset, int size) {
        String sql = "SELECT p.*, o.id AS orderId, o.buyer_id AS buyerId, "
                + "u2.username AS buyerName, o.price AS dealPrice, o.status AS orderStatus, o.created_at AS buyTime, "
                + "o.delivered_at AS deliveredAt, o.finished_at AS finishedAt "
                + "FROM product p "
                + "LEFT JOIN product_order o ON o.id = ("
                + "    SELECT po.id FROM product_order po WHERE po.product_id = p.id "
                + "    ORDER BY (po.status <> 'cancelled') DESC, po.created_at DESC, po.id DESC LIMIT 1"
                + ") "
                + "LEFT JOIN user u2 ON u2.id = o.buyer_id "
                + "WHERE p.seller_id = ? AND p.is_deleted = 0 "
                + "ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class), sellerId, size, offset);
    }

    public long countPublishedByUser(int sellerId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product WHERE seller_id = ? AND is_deleted = 0",
                Long.class, sellerId);
        return count == null ? 0 : count;
    }

    /** 个人空间：我购买的商品（附卖家与成交信息）。 */
    public List<Product> findBoughtByUser(int buyerId, int offset, int size) {
        String sql = "SELECT p.*, o.id AS orderId, u2.username AS sellerName, "
                + "o.price AS dealPrice, o.status AS orderStatus, o.created_at AS buyTime, "
                + "o.delivered_at AS deliveredAt, o.finished_at AS finishedAt "
                + "FROM product_order o "
                + "JOIN product p ON p.id = o.product_id "
                + "JOIN user u2 ON u2.id = p.seller_id "
                + "WHERE o.buyer_id = ? "
                + "ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class), buyerId, size, offset);
    }

    public long countBoughtByUser(int buyerId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_order WHERE buyer_id = ?",
                Long.class, buyerId);
        return count == null ? 0 : count;
    }

    // ============================ 管理员 ============================

    /**
     * 管理员商品列表：查原始 product 表（不过滤审核状态，但排除已软删除），
     * 可按 auditStatus 与关键词过滤。auditStatus 传 null 表示不过滤。
     */
    public List<Product> findAdminList(String auditStatus, String keyword, int offset, int size) {
        String p = likePattern(keyword);
        String sql = "SELECT t.*, u.username AS sellerName "
                + "FROM product t JOIN user u ON u.id = t.seller_id "
                + "WHERE t.is_deleted = 0 "
                + "AND (? IS NULL OR t.audit_status = ?) "
                + "AND (t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\') "
                + "ORDER BY t.created_at DESC LIMIT ? OFFSET ?";
        return jdbc.query(sql, new BeanPropertyRowMapper<>(Product.class),
                auditStatus, auditStatus, p, p, size, offset);
    }

    public long countAdminList(String auditStatus, String keyword) {
        String p = likePattern(keyword);
        String sql = "SELECT COUNT(*) FROM product t "
                + "WHERE t.is_deleted = 0 "
                + "AND (? IS NULL OR t.audit_status = ?) "
                + "AND (t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\')";
        Long count = jdbc.queryForObject(sql, Long.class, auditStatus, auditStatus, p, p);
        return count == null ? 0 : count;
    }

    /** 管理员审核：只改 audit_status 与 audit_remark，不动业务 status。返回受影响行数。 */
    public int audit(int id, String auditStatus, String remark) {
        return jdbc.update(
                "UPDATE product SET audit_status=?, audit_remark=?, updated_at=datetime('now','localtime') "
              + "WHERE id=? AND is_deleted=0",
                auditStatus, remark, id);
    }

    /** 管理员软删除：不限发布者，直接置 is_deleted=1。返回受影响行数。 */
    public int softDeleteByAdmin(int id, int adminId) {
        return jdbc.update(
                "UPDATE product SET is_deleted=1, deleted_by=?, "
              + "deleted_at=datetime('now','localtime'), updated_at=datetime('now','localtime') "
              + "WHERE id=? AND is_deleted=0",
                adminId, id);
    }

    private static String likePattern(String keyword) {
        if (keyword == null || keyword.isEmpty()) {
            return "%";
        }
        String esc = keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return "%" + esc + "%";
    }
}
