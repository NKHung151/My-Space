package com.myspace.myspace.moderation;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@Component
@Slf4j
public class ModerationClient {
    private final RestClient client;

    public ModerationClient(@Value("${moderation.url:http://127.0.0.1:8000}") String url,
            @Value("${moderation.api-key:}") String apiKey) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(10));
        var builder = RestClient.builder().baseUrl(url).requestFactory(factory);
        if (!apiKey.isBlank())
            builder.defaultHeader("X-API-Key", apiKey);
        this.client = builder.build();
    }

    public ModerationResult moderate(byte[] imageBytes) {
        try {
            var body = new LinkedMultiValueMap<String, Object>();
            body.add("file", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "upload";
                } // FastAPI cần filename
            });
            ModerationResult r = client.post().uri("/moderate")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(ModerationResult.class);
            if (r == null)
                throw new IllegalStateException("Phản hồi rỗng");
            return r;
        } catch (HttpClientErrorException.BadRequest e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tệp tải lên không phải ảnh hợp lệ");
        } catch (Exception e) {
            log.warn("Moderation service lỗi: {}", e.toString());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Hệ thống kiểm duyệt ảnh đang bận, vui lòng thử lại sau");
        }
    }
}