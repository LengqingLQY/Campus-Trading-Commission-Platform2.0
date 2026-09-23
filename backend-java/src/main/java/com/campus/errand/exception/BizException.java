package com.campus.errand.exception;

/**
 * 业务异常。Service 层遇到可预期的业务失败（参数非法、无权限、状态冲突等）
 * 直接抛出本异常，由 GlobalExceptionHandler 统一转成
 * {@code HTTP status = code} 的 {@code {"code":..,"msg":..,"data":null}} 响应。
 *
 * code 与 HTTP 状态码保持一致（400/401/403/404/409），
 * 保证契约 §3.1「失败不能统一返回 200」的要求。
 */
public class BizException extends RuntimeException {

    private final int code;

    public BizException(int code, String msg) {
        super(msg);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
