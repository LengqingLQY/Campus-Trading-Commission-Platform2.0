package com.campus.errand.service;

import com.campus.errand.exception.BizException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

/**
 * 本地文件存储（增量契约：图片功能 §3）。
 *
 * 图片/头像统一落到 app.upload.dir 目录，文件名用随机 UUID，扩展名由 Content-Type
 * 白名单映射（不从原始文件名取，避免路径穿越与伪装扩展名）。返回可直接被 <img> 加载
 * 的完整 URL（/uploads/** 静态映射在 WebConfig 里）。
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    /** 允许的图片类型 -> 存储扩展名。白名单既做格式校验又决定落盘后缀。 */
    private static final Map<String, String> EXT_BY_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/gif", ".gif",
            "image/webp", ".webp"
    );

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    /**
     * 保存图片，返回可访问的完整 URL。
     */
    public String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException(400, "请选择要上传的图片");
        }

        String ext = EXT_BY_TYPE.get(file.getContentType());
        if (ext == null) {
            throw new BizException(400, "图片格式不支持");
        }

        String filename = UUID.randomUUID().toString() + ext;
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(filename).toFile());
        } catch (IOException e) {
            log.error("图片保存失败: {}", e.getMessage(), e);
            throw new BizException(500, "图片保存失败");
        }

        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/").path(filename)
                .toUriString();
    }
}