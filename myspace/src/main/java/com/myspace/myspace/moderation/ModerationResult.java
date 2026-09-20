package com.myspace.myspace.moderation;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ModerationResult(@JsonProperty("p_unsafe") double pUnsafe, String status) {
}