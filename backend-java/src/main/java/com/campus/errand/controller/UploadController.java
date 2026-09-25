package com.campus.errand.controller;

import com.campus.errand.pojo.Result;
import com.campus.errand.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 通用图片上传接口（增量契约：图片功能 §3.1）。
 *
 * POST /api/upload/image，multipart 字段名 file，返回 {url}。
 * 挂 /api/**，由拦截器保证登录；格式/大小校验在 FileStorageService 与全局异常处理。
 */
@RestController
@RequestMapping("/api")
public class UploadController {

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * POST /api/upload/image —— 上传图片，返回可访问 URL。
     */
    @PostMapping("/upload/image")
    public Result uploadImage(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeImage(file);
        return Result.ok(Map.of("url", url));
    }
}