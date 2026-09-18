package com.myspace.myspace.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UploadServiceImpl implements UploadService {

    private final Cloudinary cloudinary;

    @Override
    public UploadResponse uploadMedia(MultipartFile file, Long userId) {
        String contentType = file.getContentType();
        String resourceType = "auto"; // Cloudinary can auto-detect image/video/audio
        if (contentType != null && contentType.startsWith("video/")) {
            resourceType = "video";
        } else if (contentType != null && contentType.startsWith("audio/")) {
            resourceType = "video"; // Cloudinary treats audio as video for upload resource_type
        } else if (contentType != null && contentType.startsWith("image/")) {
            resourceType = "image";
        }
        return uploadToCloudinary(file, resourceType);
    }

    @Override
    public UploadResponse uploadAvatar(MultipartFile file, Long userId) {
        return uploadToCloudinary(file, "image");
    }

    @Override
    public UploadResponse importExternalImage(String url, Long userId) {
        try {
            Map uploadResult = cloudinary.uploader().upload(url, ObjectUtils.asMap(
                    "resource_type", "image"
            ));

            return UploadResponse.builder()
                    .url(uploadResult.get("secure_url").toString())
                    .mediaId(uploadResult.get("public_id").toString())
                    .mediaType("image")
                    .mimeType(uploadResult.get("format").toString())
                    .build();
        } catch (IOException e) {
            log.error("Error importing external image", e);
            throw new RuntimeException("Could not import external image");
        }
    }

    @Override
    public void deleteEditorMedia(String url, Long userId) {
        try {
            // https://res.cloudinary.com/.../image/upload/v.../folder/public_id.jpg
            String publicId = null;
            int uploadIdx = url.indexOf("/upload/");
            if (uploadIdx != -1) {
                String path = url.substring(uploadIdx + "/upload/".length());
                if (path.matches("^v\\d+/.*")) {
                    path = path.replaceFirst("^v\\d+/", "");
                }
                int lastDot = path.lastIndexOf('.');
                if (lastDot != -1) {
                    publicId = path.substring(0, lastDot);
                } else {
                    publicId = path;
                }
            }

            if (publicId != null) {
                String resourceType = "image";
                if (url.matches(".*\\.(mp4|webm|ogg|mp3|wav)$")) {
                    resourceType = "video";
                }
                cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
            }
        } catch (Exception e) {
            log.error("Error deleting media from Cloudinary", e);
        }
    }

    private UploadResponse uploadToCloudinary(MultipartFile file, String resourceType) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "myspace"
            ));

            return UploadResponse.builder()
                    .url(uploadResult.get("secure_url").toString())
                    .mediaId(uploadResult.get("public_id").toString())
                    .mediaType(resourceType)
                    .mimeType(file.getContentType())
                    .build();
        } catch (IOException e) {
            log.error("Error uploading to Cloudinary", e);
            throw new RuntimeException("Could not upload file to Cloudinary");
        }
    }
}
