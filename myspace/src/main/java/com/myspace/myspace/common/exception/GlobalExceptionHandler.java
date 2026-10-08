package com.myspace.myspace.common.exception;

import com.myspace.myspace.common.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ApiResponse<Void> response = ApiResponse.error(HttpStatus.BAD_REQUEST.value(), "Validation failed", errors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        ApiResponse<Void> response = ApiResponse.error(ex.getStatus().value(), ex.getMessage(), null);
        return new ResponseEntity<>(response, ex.getStatus());
    }

    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(org.springframework.security.authentication.BadCredentialsException ex) {
        ApiResponse<Void> response = ApiResponse.error(HttpStatus.UNAUTHORIZED.value(), "Email hoặc mật khẩu không chính xác!", null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<ApiResponse<Void>> handleDisabledException(org.springframework.security.authentication.DisabledException ex) {
        ApiResponse<Void> response = ApiResponse.error(HttpStatus.FORBIDDEN.value(), "Tài khoản đã bị khóa.", null);
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGlobalException(Exception ex) {
        ApiResponse<Void> response = ApiResponse.error(HttpStatus.INTERNAL_SERVER_ERROR.value(), ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
