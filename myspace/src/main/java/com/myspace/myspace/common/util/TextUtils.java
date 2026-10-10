package com.myspace.myspace.common.util;

import java.text.Normalizer;
import java.util.regex.Pattern;

public final class TextUtils {

    private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private TextUtils() {}

    // Bỏ dấu tiếng Việt + chữ thường, dùng cho các cột unaccented_* phục vụ tìm kiếm không dấu.
    // "đ"/"Đ" không phải ký tự tổ hợp nên NFD không tách được — phải thay riêng.
    
    public static String unaccent(String value) {
        if (value == null) return null;
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        return COMBINING_MARKS.matcher(decomposed).replaceAll("")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase()
                .trim();
    }
}
