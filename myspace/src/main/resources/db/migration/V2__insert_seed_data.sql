-- Insert core Roles
INSERT INTO roles (name) VALUES ('USER');
INSERT INTO roles (name) VALUES ('ADMIN');

-- Insert initial Admin user
-- Password is '123456' (Bcrypt hashed)
INSERT INTO users (email, username, password, display_name, unaccented_display_name, status, role_id, created_at, updated_at) 
VALUES (
    'admin@myspace.com', 
    'admin', 
    '$2a$10$vI8aWNnOExi/JvOUMD2pZ.U3.z59u8Q74tD2R.Z.2D1w6P2u13iO2', -- hash của 123456
    'System Admin', 
    'system admin', 
    'ACTIVE', 
    2, -- ADMIN role
    NOW(), 
    NOW()
);

-- Insert initial User
INSERT INTO users (email, username, password, display_name, unaccented_display_name, status, role_id, created_at, updated_at) 
VALUES (
    'user@myspace.com', 
    'user1', 
    '$2a$10$vI8aWNnOExi/JvOUMD2pZ.U3.z59u8Q74tD2R.Z.2D1w6P2u13iO2', -- hash của 123456
    'Normal User', 
    'normal user', 
    'ACTIVE', 
    1, -- USER role
    NOW(), 
    NOW()
);
