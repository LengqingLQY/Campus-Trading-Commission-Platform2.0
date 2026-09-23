package com.campus.errand.exception;

import com.campus.errand.pojo.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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
     * 兜底：未预期的异常。
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result> handleOther(Exception e) {
        log.error("未处理异常", e);
        return ResponseEntity.status(500)
                .body(Result.fail(500, "系统繁忙，请稍后重试"));
    }
}
