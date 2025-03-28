ALTER TABLE system_user ADD COLUMN password VARCHAR(255) NOT NULL AFTER email;

UPDATE system_user 
SET password = '2b$10$YFgdsCJC0d8y1kPIX.bOEOBicbxO/GTJx.P3hlAeq6m.0nyeQREtu' 
WHERE id = 1;
