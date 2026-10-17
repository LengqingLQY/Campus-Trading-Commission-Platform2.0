package com.campus.errand.dto;

/** 公开资料专用结构，不包含账号、密码和联系方式。 */
public record PublicUserRating(int userId, String username, String avatarUrl,
                               RatingSummary buyer, RatingSummary seller) {}
