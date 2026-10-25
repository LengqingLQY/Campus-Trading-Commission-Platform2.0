package com.campus.errand.dto;

public record NotificationItem(long id, String type, String category, String title, String content,
                               String targetType, int targetId, boolean read, String readAt, String createdAt) {}
