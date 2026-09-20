package com.campus.errand.pojo;

/**
 * 统一响应体。所有接口一律返回这个结构，前端只写一个 request() 封装即可。
 *
 *   成功：{"code":0,    "msg":"ok",          "data":{...}}
 *   失败：{"code":409,  "msg":"任务已被接取", "data":null}
 *
 * code 为 0 表示成功，非 0 时其值与 HTTP 状态码保持一致，方便前端统一判断。
 */
public class Result {

    private int code;
    private String msg;
    private Object data;

    public Result(int code, String msg, Object data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static Result ok() {
        return new Result(0, "ok", null);
    }

    public static Result ok(Object data) {
        return new Result(0, "ok", data);
    }

    public static Result fail(int code, String msg) {
        return new Result(code, msg, null);
    }

    public int getCode() {
        return code;
    }

    public String getMsg() {
        return msg;
    }

    public Object getData() {
        return data;
    }
}
