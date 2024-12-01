-- Insert default categories (created_by is NULL for system defaults)
INSERT INTO categories (name, color, created_by, created_at) VALUES
('Work', '#FF4444', NULL, NOW()),
('Personal', '#4CAF50', NULL, NOW()),
('Shopping', '#2196F3', NULL, NOW()),
('Health', '#9C27B0', NULL, NOW()),
('Home', '#FF9800', NULL, NOW()),
('Study', '#607D8B', NULL, NOW()),
('Projects', '#795548', NULL, NOW()),
('Meetings', '#E91E63', NULL, NOW());
