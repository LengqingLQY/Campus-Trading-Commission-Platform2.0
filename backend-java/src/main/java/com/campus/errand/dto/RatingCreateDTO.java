package com.campus.errand.dto;

import com.fasterxml.jackson.databind.JsonNode;

/** 保留 JSON 类型，禁止把 4.5、"5" 或 true 自动转换为整数评分。 */
public record RatingCreateDTO(JsonNode stars) {}
