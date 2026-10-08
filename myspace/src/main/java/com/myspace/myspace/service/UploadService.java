package com.myspace.myspace.service;

import com.myspace.myspace.dto.response.UploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface UploadService {
    UploadResponse uploadMedia(MultipartFile file, Long userId);
    UploadResponse uploadAvatar(MultipartFile file, Long userId);
    void deleteEditorMedia(String url, Long userId);
}
