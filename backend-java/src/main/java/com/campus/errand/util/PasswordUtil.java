package com.campus.errand.util;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * 密码哈希工具（对应需求 P0-05：数据库只存哈希，不存明文）。
 *
 * 关键约束：必须和 init_db.py 生成的哈希格式完全兼容，
 * 否则现有预置账号（admin/alice/bob/carol）在 Java 端登不上去。
 *
 * 格式：pbkdf2:sha256:600000$盐$十六进制哈希
 *       └─ 算法 ─┘ └迭代次数┘  └16位┘  └── 64 字符 ──┘
 *
 * 用的全是 JDK 标准库（javax.crypto），不引第三方依赖。
 * Java 的 PBKDF2WithHmacSHA256 内部按 UTF-8 编码口令，
 * 与 Python 的 password.encode("utf-8") 一致，所以两边算出的值相同。
 */
public class PasswordUtil {

    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATIONS = 600000;   // 与 werkzeug 3.x 默认值一致
    private static final int KEY_LENGTH = 256;      // sha256 输出 256 位 = 32 字节 = 64 个十六进制字符
    private static final int SALT_LENGTH = 16;

    private static final String SALT_ALPHABET =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * 注册时调用：把明文口令变成可入库的哈希串。
     */
    public static String generate(String password) {
        StringBuilder salt = new StringBuilder(SALT_LENGTH);
        for (int i = 0; i < SALT_LENGTH; i++) {
            salt.append(SALT_ALPHABET.charAt(RANDOM.nextInt(SALT_ALPHABET.length())));
        }
        String saltStr = salt.toString();
        return "pbkdf2:sha256:" + ITERATIONS + "$" + saltStr + "$"
                + pbkdf2(password, saltStr, ITERATIONS);
    }

    /**
     * 登录时调用：拿用户输入的明文，和库里存的哈希串比对。
     *
     * 迭代次数从存储串里读，而不是写死常量 —— 这样将来调整迭代次数，
     * 老用户的密码依然能验证通过。
     */
    public static boolean verify(String password, String stored) {
        if (password == null || stored == null) {
            return false;
        }

        String[] parts = stored.split("\\$");
        if (parts.length != 3) {
            return false;                       // 格式不对，直接判失败
        }

        String[] method = parts[0].split(":");  // pbkdf2:sha256:600000
        if (method.length != 3 || !"pbkdf2".equals(method[0]) || !"sha256".equals(method[1])) {
            return false;
        }

        int iterations;
        try {
            iterations = Integer.parseInt(method[2]);
        } catch (NumberFormatException e) {
            return false;
        }

        String actual = pbkdf2(password, parts[1], iterations);

        // 用 isEqual 而不是 equals：定长比较，避免通过响应时间猜出哈希前缀
        return MessageDigest.isEqual(
                actual.getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8));
    }

    private static String pbkdf2(String password, String salt, int iterations) {
        try {
            PBEKeySpec spec = new PBEKeySpec(
                    password.toCharArray(),
                    salt.getBytes(StandardCharsets.UTF_8),
                    iterations,
                    KEY_LENGTH);
            byte[] hash = SecretKeyFactory.getInstance(ALGORITHM).generateSecret(spec).getEncoded();
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("密码哈希计算失败", e);
        }
    }
}
