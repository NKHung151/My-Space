package com.myspace.myspace.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> data;
    private Meta meta;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Meta {
        private long total;
        private int page;
        private int limit;
        private int totalPages;
    }

    public static <T> PageResponse<T> of(Page<T> page) {
        return PageResponse.<T>builder()
                .data(page.getContent())
                .meta(Meta.builder()
                        .total(page.getTotalElements())
                        .page(page.getNumber() + 1) // Spring Data page là 0-indexed, FE cần 1-indexed
                        .limit(page.getSize())
                        .totalPages(page.getTotalPages())
                        .build())
                .build();
    }
}
