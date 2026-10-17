package com.campus.errand.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record RatingOrderItem(String kind, int orderId, String title, int counterpartyId,
                              String counterpartyName, String counterpartRole,
                              String finishedAt, Integer myRatingStars) {}
