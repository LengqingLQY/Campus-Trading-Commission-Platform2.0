package com.campus.errand.util;

import com.campus.errand.exception.BizException;

public final class PhoneValidator {
    private PhoneValidator() {}

    /** 电话可不填；填写时与前端一致，必须为 11 位数字。 */
    public static void validate(String phone) {
        if (phone != null && !phone.isEmpty() && !phone.matches("[0-9]{11}")) {
            throw new BizException(400, "电话必须为 11 位数字");
        }
    }
}
