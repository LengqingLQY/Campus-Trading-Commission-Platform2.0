package com.campus.errand.dto;

/**
 * 管理员审核请求体（增量契约：管理员模块）。
 */
public class AdminAuditDTO {

    private Boolean approve;   // true=通过，false=驳回
    private String remark;     // 驳回理由（仅驳回时必填，2~200 字）

    public Boolean getApprove() { return approve; }
    public void setApprove(Boolean approve) { this.approve = approve; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
