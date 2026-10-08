package com.myspace.myspace.common.util;

/**
 * Nhận diện loại file dựa trên magic bytes ở đầu file, KHÔNG dựa vào Content-Type do client gửi
 * (client có thể gửi ảnh với Content-Type tùy ý để né bước kiểm duyệt ảnh).
 */
public final class FileSignature {

    public enum Kind { IMAGE, AUDIO_VIDEO, UNKNOWN }

    private FileSignature() {}

    public static Kind detect(byte[] b) {
        if (b == null || b.length < 12) return Kind.UNKNOWN;

        // --- Ảnh: JPEG, PNG, GIF, WebP ---
        if (u(b[0]) == 0xFF && u(b[1]) == 0xD8 && u(b[2]) == 0xFF) return Kind.IMAGE;
        if (u(b[0]) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return Kind.IMAGE;
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') return Kind.IMAGE;
        if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return Kind.IMAGE;

        // --- Video / audio: MP4/MOV/M4A (ftyp), WebM/MKV (EBML), Ogg, WAV, MP3 (ID3 / frame sync), AAC (ADTS) ---
        if (ascii(b, 4, "ftyp")) return Kind.AUDIO_VIDEO;
        if (u(b[0]) == 0x1A && u(b[1]) == 0x45 && u(b[2]) == 0xDF && u(b[3]) == 0xA3) return Kind.AUDIO_VIDEO;
        if (ascii(b, 0, "OggS")) return Kind.AUDIO_VIDEO;
        if (ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE")) return Kind.AUDIO_VIDEO;
        if (ascii(b, 0, "ID3")) return Kind.AUDIO_VIDEO;
        if (u(b[0]) == 0xFF && (u(b[1]) & 0xE0) == 0xE0) return Kind.AUDIO_VIDEO;

        return Kind.UNKNOWN;
    }

    private static int u(byte x) {
        return x & 0xFF;
    }

    private static boolean ascii(byte[] b, int offset, String s) {
        if (b.length < offset + s.length()) return false;
        for (int i = 0; i < s.length(); i++) {
            if (b[offset + i] != (byte) s.charAt(i)) return false;
        }
        return true;
    }
}
