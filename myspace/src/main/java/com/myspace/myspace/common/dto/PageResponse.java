package com.myspace.myspace.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
        return of(page, page.getContent());
    }

    public static <T> PageResponse<T> of(Page<?> page, List<T> items) {
        return of(items, page.getTotalElements(), page.getPageable());
    }

    public static <T> PageResponse<T> of(List<T> items, long total, Pageable pageable) {
        int limit = pageable.getPageSize();
        return PageResponse.<T>builder()
                .data(items)
                .meta(Meta.builder()
                        .total(total)
                        .page(pageable.getPageNumber() + 1) // Spring Data page là 0-indexed, FE cần 1-indexed
                        .limit(limit)
                        .totalPages((int) Math.ceil((double) total / limit))
                        .build())
                .build();
    }
}
