package com.myspace.myspace.mapper;

import com.myspace.myspace.dto.response.UploadResponse;
import com.myspace.myspace.entity.MediaAsset;

public final class MediaMapper {

    private MediaMapper() {}

    public static UploadResponse toUploadResponse(MediaAsset asset) {
        return UploadResponse.builder()
                .url(asset.getUrl())
                .mediaId(asset.getPublicId())
                .mediaType(asset.getMediaType())
                .mimeType(asset.getMimeType())
                .build();
    }
}
