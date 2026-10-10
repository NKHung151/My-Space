package com.myspace.myspace.common.util;

import org.jsoup.Jsoup;

import java.util.LinkedHashSet;
import java.util.Set;

// Thu thập URL media Cloudinary trong 1 bài viết (ảnh bìa + src của img/video/audio/source trong nội dung).
public final class MediaUrls {

    private static final String CLOUDINARY_HOST = "res.cloudinary.com";

    private MediaUrls() {}

    public static Set<String> ofPost(String html, String coverImageUrl) {
        Set<String> urls = new LinkedHashSet<>();
        if (isCloudinary(coverImageUrl)) {
            urls.add(coverImageUrl);
        }
        if (html != null && !html.isBlank()) {
            Jsoup.parseBodyFragment(html).select("img[src], video[src], audio[src], source[src]")
                    .forEach(el -> {
                        String src = el.attr("src");
                        if (isCloudinary(src)) urls.add(src);
                    });
        }
        return urls;
    }

    private static boolean isCloudinary(String url) {
        return url != null && url.contains(CLOUDINARY_HOST);
    }
}
