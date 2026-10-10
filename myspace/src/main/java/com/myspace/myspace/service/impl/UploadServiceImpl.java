package com.myspace.myspace.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.myspace.myspace.mapper.MediaMapper;
import com.myspace.myspace.common.exception.AppException;
import com.myspace.myspace.common.util.AfterCommit;
import com.myspace.myspace.common.util.FileSignature;
import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.moderation.ModerationClient;
import com.myspace.myspace.moderation.ModerationResult;
import com.myspace.myspace.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
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

    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final long MAX_AUDIO_VIDEO_BYTES = 100L * 1024 * 1024;

    @Override
    public UploadResponse uploadMedia(MultipartFile file, Long userId) {
        // Loại file xác định từ nội dung (16 byte đầu), không từ Content-Type client gửi:
        // trước đây gửi ảnh kèm Content-Type lạ thì resource_type = "auto" và ảnh không qua kiểm duyệt.
        return switch (FileSignature.detect(readHeader(file))) {
            case IMAGE -> {
                byte[] bytes = readImage(file);
                moderateImage(bytes, userId);
                yield uploadToCloudinary(bytes, file.getContentType(), "image", userId, "TEMPORARY");
            }
            case AUDIO_VIDEO -> uploadAudioVideo(file, userId); // Cloudinary dùng resource_type "video" cho cả audio
            case UNKNOWN -> throw new AppException(HttpStatus.BAD_REQUEST, "Định dạng tệp không được hỗ trợ.");
        };
    }

    @Override
    public UploadResponse uploadAvatar(MultipartFile file, Long userId) {
        if (FileSignature.detect(readHeader(file)) != FileSignature.Kind.IMAGE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ảnh đại diện phải là JPG, PNG, GIF hoặc WebP.");
        }
        byte[] bytes = readImage(file);
        moderateImage(bytes, userId);
        return uploadToCloudinary(bytes, file.getContentType(), "image", userId, "ATTACHED");
    }

    // Chỉ đọc vài byte đầu để nhận diện loại file, không nạp cả file vào RAM.
    private byte[] readHeader(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(16);
        } catch (IOException e) {
            log.error("Không đọc được file upload", e);
            throw new AppException(HttpStatus.BAD_REQUEST, "Không đọc được tệp tải lên.");
        }
    }

    // Ảnh cần đọc toàn bộ để gửi kiểm duyệt; giới hạn 10MB (bằng giới hạn của service AI) trước khi đọc.
    private byte[] readImage(MultipartFile file) {
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh quá lớn (tối đa 10 MB).");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            log.error("Không đọc được file upload", e);
            throw new AppException(HttpStatus.BAD_REQUEST, "Không đọc được tệp tải lên.");
        }
    }

    private UploadResponse uploadAudioVideo(MultipartFile file, Long userId) {
        if (file.getSize() > MAX_AUDIO_VIDEO_BYTES) {
            throw new AppException(HttpStatus.PAYLOAD_TOO_LARGE, "Video/âm thanh quá lớn (tối đa 100 MB).");
        }
        Path tmp = null;
        try {
            tmp = Files.createTempFile("myspace-upload-", ".bin");
            file.transferTo(tmp);
            return uploadToCloudinary(tmp.toFile(), file.getContentType(), "video", userId, "TEMPORARY");
        } catch (IOException e) {
            log.error("Không lưu được file tạm khi upload", e);
            throw new AppException(HttpStatus.BAD_REQUEST, "Không đọc được tệp tải lên.");
        } finally {
            if (tmp != null) {
                try {
                    Files.deleteIfExists(tmp);
                } catch (IOException e) {
                    log.warn("Không xóa được file tạm {}", tmp);
                }
            }
        }
    }

    private void moderateImage(byte[] bytes, Long userId) {
        // Quét TRƯỚC khi lên Cloudinary (video/audio chưa được kiểm duyệt)
        ModerationResult mod = moderationClient.moderate(bytes);
        if ("REJECTED".equals(mod.status())) {
            log.info("Từ chối ảnh của user {} (p_unsafe={})", userId, mod.pUnsafe());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Ảnh vi phạm quy định cộng đồng. Vui lòng chọn ảnh khác.");
        }
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

        String publicId = asset.getPublicId();
        String resourceType = "video".equals(asset.getMediaType()) ? "video" : "image";

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            // Đang trong transaction (xóa/sửa bài, đổi avatar): xóa bản ghi cùng transaction,
            // chỉ xóa file trên Cloudinary SAU KHI commit — rollback thì file vẫn còn nguyên
            mediaAssetRepository.delete(asset);
            AfterCommit.run(() -> destroyOnCloudinary(publicId, resourceType));
        } else {
            // Không có transaction (job dọn media tạm): xóa file trước, thành công mới xóa bản ghi để lần sau còn thử lại
            if (destroyOnCloudinary(publicId, resourceType)) {
                mediaAssetRepository.delete(asset);
            }
        }
    }

    private boolean destroyOnCloudinary(String publicId, String resourceType) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
            return true;
        } catch (Exception e) {
            log.error("Error deleting media {} from Cloudinary", publicId, e);
            return false;
        }
    }

    // @param source byte[] (ảnh) hoặc java.io.File (video/audio ghi tạm ra đĩa)
    private UploadResponse uploadToCloudinary(Object source, String contentType, String resourceType, Long userId, String status) {
        try {
            Map uploadResult = cloudinary.uploader().upload(source, ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "myspace"));

            String url = uploadResult.get("secure_url").toString();
            String publicId = uploadResult.get("public_id").toString();
            String format = uploadResult.get("format") != null ? uploadResult.get("format").toString()
                    : contentType;

            MediaAsset asset = new MediaAsset();
            asset.setPublicId(publicId);
            asset.setUrl(url);
            asset.setMediaType(resourceType);
            asset.setMimeType(format);
            asset.setOwner(userRepository.getReferenceById(userId));
            asset.setStatus(status);
            return MediaMapper.toUploadResponse(mediaAssetRepository.save(asset));
        } catch (IOException e) {
            log.error("Error uploading to Cloudinary", e);
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "Không thể tải tệp lên, vui lòng thử lại sau.");
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