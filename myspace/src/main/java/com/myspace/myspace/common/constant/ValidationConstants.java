package com.myspace.myspace.common.constant;

public class ValidationConstants {

    /**
     * Regex Pattern for Strong Passwords.
     * Must be 8-72 characters long.
     * Must contain at least one lowercase letter, one uppercase letter, one digit, and one special character.
     * Must not contain whitespaces.
     */
    public static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])\\S{8,72}$";

    /**
     * Standard Email Regex Pattern
     */
    public static final String EMAIL_REGEX = "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$";

}
