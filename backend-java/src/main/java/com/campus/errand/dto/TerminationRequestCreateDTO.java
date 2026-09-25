package com.campus.errand.dto;

/**
 * 发起终止申请请求体（增量契约：二手商品软删除确认与订单双向终止 §6.1）。
 * 发起方身份从 session 取得，不在此 DTO 中。
 */
public class TerminationRequestCreateDTO {

    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}