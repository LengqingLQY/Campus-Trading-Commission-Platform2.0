package com.campus.errand.exception;

import com.campus.errand.pojo.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * 统一异常处理：Controller 内不写 try-catch，所有异常在这里转成统一响应结构，
 * 且 HTTP 状态码与 body 里的 code 保持一致（契约 §3.1）。
 *
 * 异常堆栈只写日志，不返回给客户端，避免泄漏表名、字段名与文件路径。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 业务异常：Service 主动抛出，code 直接决定 HTTP 状态码。
     */
    @ExceptionHandler(BizException.class)
    public ResponseEntity<Result> handleBiz(BizException e) {
        return ResponseEntity.status(e.getCode())
                .body(Result.fail(e.getCode(), e.getMessage()));
    }

    /**
     * 唯一约束冲突：重复账号、重复接取、重复购买。
     * 数据库约束是第二道防线，正常情况下 Service 层已主动拦截并返回精确提示。
     */
    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<Result> handleDuplicate(DuplicateKeyException e) {
        return ResponseEntity.status(409)
                .body(Result.fail(409, "操作冲突，请刷新后重试"));
    }

    /**
     * CHECK / 外键等约束冲突：自接取、自购买、非法枚举值、负数金额。
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Result> handleIntegrity(DataIntegrityViolationException e) {
        log.warn("数据库约束拦截: {}", e.getMessage());
        return ResponseEntity.status(409)
                .body(Result.fail(409, "数据不符合要求"));
    }

    /**
     * 请求体无法解析：JSON 语法错误、编码不是 UTF-8、字段类型不符等。
     * 属于客户端参数问题，返回 400，而不是漏到兜底 500。
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result> handleNotReadable(HttpMessageNotReadableException e) {
        return ResponseEntity.status(400)
                .body(Result.fail(400, "请求体格式不正确"));
    }

    /**
     * 路径 / 查询参数类型不符：例如 /api/tasks/abc 中的 abc 不是整数。
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Result> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.status(400)
                .body(Result.fail(400, "请求参数格式不正确"));
    }

    /**
     * 上传文件超过大小上限（增量契约：图片功能 §3.1，5MB）。
     * 由 multipart 配置触发，返回 400 而非漏到兜底 500。
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Result> handleMaxUpload(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(400)
                .body(Result.fail(400, "图片超过大小限制"));
    }

    /**
     * 兜底：未预期的异常。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result> handleOther(Exception e) {
        log.error("未处理异常", e);
        return ResponseEntity.status(500)
                .body(Result.fail(500, "系统繁忙，请稍后重试"));
    }
}
