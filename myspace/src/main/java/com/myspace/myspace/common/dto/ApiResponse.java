package com.myspace.myspace.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private Integer status;
    private String message;
    private Object details; // Dùng để chứa thông tin chi tiết lỗi (nếu có)

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .status(200)
                .message("ok")
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String message, Object details) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(status)
                .message(message)
                .details(details)
                .build();
    }
}
