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

import com.myspace.myspace.repository.MediaAssetRepository;
import com.myspace.myspace.repository.UserRepository;
import com.myspace.myspace.entity.MediaAsset;

@Service
@RequiredArgsConstructor
@Slf4j
public class UploadServiceImpl implements UploadService {

    private final Cloudinary cloudinary;
    private final MediaAssetRepository mediaAssetRepository;
    private final UserRepository userRepository;

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
        return uploadToCloudinary(file, resourceType, userId, "TEMPORARY");
    }

    @Override
    public UploadResponse uploadAvatar(MultipartFile file, Long userId) {
        return uploadToCloudinary(file, "image", userId, "ATTACHED");
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

    private UploadResponse uploadToCloudinary(MultipartFile file, String resourceType, Long userId, String status) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "myspace"
            ));

            String url = uploadResult.get("secure_url").toString();
            String publicId = uploadResult.get("public_id").toString();
            String format = uploadResult.get("format") != null ? uploadResult.get("format").toString() : file.getContentType();

            MediaAsset asset = new MediaAsset();
            asset.setPublicId(publicId);
            asset.setUrl(url);
            asset.setMediaType(resourceType);
            asset.setMimeType(format);
            asset.setOwner(userRepository.getReferenceById(userId));
            asset.setStatus(status);
            mediaAssetRepository.save(asset);

            return UploadResponse.builder()
                    .url(url)
                    .mediaId(publicId)
                    .mediaType(resourceType)
                    .mimeType(format)
                    .build();
        } catch (IOException e) {
            log.error("Error uploading to Cloudinary", e);
            throw new RuntimeException("Could not upload file to Cloudinary");
        }
    }

    // Run every hour: 3600000 ms
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 3600000)
    public void cleanupTemporaryMedia() {
        log.info("Starting media cleanup task...");
        
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusHours(1);
        java.util.List<com.myspace.myspace.entity.MediaAsset> trashMedia = mediaAssetRepository.findByStatusAndCreatedAtBefore("TEMPORARY", cutoff);
        
        if (trashMedia.isEmpty()) {
            return;
        }

        log.info("Found {} temporary media files to delete.", trashMedia.size());

        for (com.myspace.myspace.entity.MediaAsset asset : trashMedia) {
            try {
                deleteEditorMedia(asset.getUrl(), asset.getOwner().getId());
                mediaAssetRepository.delete(asset);
                log.info("Deleted temporary media: {}", asset.getUrl());
            } catch (Exception e) {
                log.error("Failed to delete media asset id {}: {}", asset.getId(), e.getMessage());
            }
        }
    }
}
