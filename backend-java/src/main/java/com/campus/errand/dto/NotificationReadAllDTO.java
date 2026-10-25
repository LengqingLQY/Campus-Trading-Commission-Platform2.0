package com.campus.errand.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record NotificationReadAllDTO(JsonNode upToId) {}
