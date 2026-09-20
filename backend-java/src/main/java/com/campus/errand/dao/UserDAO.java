package com.campus.errand.dao;

import com.campus.errand.pojo.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BeanPropertyRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 用户表数据访问。
 *
 * 对比 Javatest 的 UserDAO：那边每个方法要自己 getConnection / prepareStatement /
 * 遍历 ResultSet / finally 里关三个资源，一个查询 25 行；
 * 这边 JdbcTemplate 把这些全包了，SQL 还是自己写，一个查询 3 行。
 *
 * BeanPropertyRowMapper 负责把结果集的列名映射到 User 的属性：
 * password_hash -> setPasswordHash()，下划线转驼峰是它自动做的。
 */
@Repository
public class UserDAO {

    @Autowired
    private JdbcTemplate jdbc;

    /**
     * 按登录账号查用户。查不到返回 null。
     *
     * 用 query(...) 取列表再取第一条，而不是 queryForObject —— 后者查不到会抛异常，
     * 而"账号不存在"是正常业务分支，不该走异常。
     */
    public User findByAccount(String account) {
        String sql = "SELECT * FROM user WHERE account = ?";
        List<User> list = jdbc.query(sql, new BeanPropertyRowMapper<>(User.class), account);
        return list.isEmpty() ? null : list.get(0);
    }
}
