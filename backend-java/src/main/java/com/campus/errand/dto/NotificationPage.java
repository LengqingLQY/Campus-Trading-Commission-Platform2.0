package com.campus.errand.dto;

import java.util.List;

public record NotificationPage(List<NotificationItem> list, long total, int page, int size,
                               long unreadCount, long latestId) {}
