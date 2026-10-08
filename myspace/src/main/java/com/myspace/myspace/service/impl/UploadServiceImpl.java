package com.myspace.myspace.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.moderation.ModerationClient;
import com.myspace.myspace.moderation.ModerationResult;
import com.myspace.myspace.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

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
    private final ModerationClient moderationClient;

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
    public void deleteEditorMedia(String url, Long userId) {
        if (url == null) return;

        // Chỉ xóa media do hệ thống quản lý (có trong media_assets) và thuộc đúng người yêu cầu.
        // Trước đây publicId được suy ra từ URL nên ai cũng xóa được file Cloudinary của người khác.
        MediaAsset asset = mediaAssetRepository.findFirstByUrl(url).orElse(null);
        if (asset == null) {
            log.warn("Bỏ qua xóa media không được quản lý: {}", url);
            return;
        }
        if (!asset.getOwner().getId().equals(userId)) {
            log.warn("User {} không sở hữu media {} (owner={}), bỏ qua xóa", userId, url, asset.getOwner().getId());
            return;
        }

        try {
            String resourceType = "video".equals(asset.getMediaType()) ? "video" : "image";
            cloudinary.uploader().destroy(asset.getPublicId(), ObjectUtils.asMap("resource_type", resourceType));
            mediaAssetRepository.delete(asset);
        } catch (Exception e) {
            log.error("Error deleting media from Cloudinary", e);
        }
    }

    private UploadResponse uploadToCloudinary(MultipartFile file, String resourceType, Long userId, String status) {
        try {
            byte[] bytes = file.getBytes();

            // Quét TRƯỚC khi lên Cloudinary (chỉ ảnh; video/audio chưa được kiểm)
            if ("image".equals(resourceType)) {
                ModerationResult mod = moderationClient.moderate(bytes);
                if ("REJECTED".equals(mod.status())) {
                    log.info("Từ chối ảnh của user {} (p_unsafe={})", userId, mod.pUnsafe());
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "Ảnh vi phạm quy định cộng đồng. Vui lòng chọn ảnh khác.");
                }
            }

            Map uploadResult = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "myspace"));

            String url = uploadResult.get("secure_url").toString();
            String publicId = uploadResult.get("public_id").toString();
            String format = uploadResult.get("format") != null ? uploadResult.get("format").toString()
                    : file.getContentType();

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
        java.util.List<com.myspace.myspace.entity.MediaAsset> trashMedia = mediaAssetRepository
                .findByStatusAndCreatedAtBefore("TEMPORARY", cutoff);

        if (trashMedia.isEmpty()) {
            return;
        }

        log.info("Found {} temporary media files to delete.", trashMedia.size());

        for (com.myspace.myspace.entity.MediaAsset asset : trashMedia) {
            try {
                deleteEditorMedia(asset.getUrl(), asset.getOwner().getId());
                log.info("Deleted temporary media: {}", asset.getUrl());
            } catch (Exception e) {
                log.error("Failed to delete media asset id {}: {}", asset.getId(), e.getMessage());
            }
        }
    }
}