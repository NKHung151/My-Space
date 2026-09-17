package com.myspace.myspace.service;

public interface MailService {
    void sendPasswordResetEmail(String to, String otp);
}
