package com.myspace.myspace.common.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Paging {

    public static final int MAX_LIMIT = 100;

    private Paging() {}

    public static Pageable of(int page, int limit) {
        return of(page, limit, Sort.unsorted());
    }

    public static Pageable of(int page, int limit, Sort sort) {
        return PageRequest.of(Math.max(page, 1) - 1, Math.clamp(limit, 1, MAX_LIMIT), sort);
    }

    public static Pageable newestFirst(int page, int limit) {
        return of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
    }
}
