package com.myspace.myspace.common.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

import java.util.regex.Pattern;

/**
 * Lọc HTML do người dùng nhập (nội dung / excerpt bài viết) trước khi lưu và trước khi trả về.
 * Chỉ giữ các thẻ/thuộc tính mà editor thực sự sinh ra, loại bỏ script, event handler (onerror, onclick...),
 * style và mọi URL không phải http/https.
 */
public final class HtmlSanitizer {

    private static final String TRUNCATED_MARKER = "<!--TRUNCATED-->";

    private static final Pattern YOUTUBE_EMBED =
            Pattern.compile("^https://(www\\.)?(youtube\\.com|youtube-nocookie\\.com)/embed/[\\w-]+.*$");

    private static final Pattern HTTP_URL = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);

    private static final Safelist SAFELIST = Safelist.relaxed()
            .addTags("figure", "figcaption", "video", "audio", "source", "iframe", "hr", "s", "mark")
            .addAttributes(":all", "class")
            .addAttributes("video", "src", "controls", "poster", "preload", "loop", "muted", "playsinline")
            .addAttributes("audio", "src", "controls", "preload", "loop")
            .addAttributes("source", "src", "type")
            .addAttributes("iframe", "src", "width", "height", "allowfullscreen", "frameborder")
            .addProtocols("video", "src", "http", "https")
            .addProtocols("video", "poster", "http", "https")
            .addProtocols("audio", "src", "http", "https")
            .addProtocols("source", "src", "http", "https")
            .addProtocols("iframe", "src", "https");

    private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

    private HtmlSanitizer() {}

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) return html;

        // Jsoup.clean xóa comment, nhưng FE cần marker này để hiện nút "Xem thêm"
        boolean truncated = html.contains(TRUNCATED_MARKER);
        String cleaned = Jsoup.clean(html.replace(TRUNCATED_MARKER, ""), "", SAFELIST, OUTPUT);

        // iframe chỉ được phép nhúng YouTube
        Document doc = Jsoup.parseBodyFragment(cleaned);
        doc.outputSettings(OUTPUT);
        boolean removed = false;
        for (Element iframe : doc.select("iframe")) {
            if (!YOUTUBE_EMBED.matcher(iframe.attr("src")).matches()) {
                iframe.remove();
                removed = true;
            }
        }
        String result = removed ? doc.body().html() : cleaned;
        return truncated ? result + TRUNCATED_MARKER : result;
    }

    /** Chỉ chấp nhận URL http/https (dùng cho ảnh bìa); trả null nếu không hợp lệ. */
    public static String safeUrl(String url) {
        if (url == null || url.isBlank()) return null;
        String trimmed = url.trim();
        return HTTP_URL.matcher(trimmed).matches() ? trimmed : null;
    }
}
