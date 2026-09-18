package com.myspace.myspace.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TagResponse {
    private String tag;
    private Long count;
}
