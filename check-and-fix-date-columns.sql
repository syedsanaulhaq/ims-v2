-- Check current date column types in tenders table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_SCALE,
    DATETIME_PRECISION,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
AND COLUMN_NAME IN ('publication_date', 'submission_date', 'opening_date', 'publish_date', 'advertisement_date')
ORDER BY COLUMN_NAME;

-- If you want to change datetime2(7) to simpler datetime, uncomment below:
/*
-- Convert datetime2(7) columns to regular datetime for better compatibility
ALTER TABLE tenders ALTER COLUMN publication_date datetime;
ALTER TABLE tenders ALTER COLUMN submission_date datetime;
ALTER TABLE tenders ALTER COLUMN opening_date datetime;
ALTER TABLE tenders ALTER COLUMN publish_date datetime;
ALTER TABLE tenders ALTER COLUMN advertisement_date datetime;

-- Verify the changes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tenders' 
AND COLUMN_NAME IN ('publication_date', 'submission_date', 'opening_date', 'publish_date', 'advertisement_date')
ORDER BY COLUMN_NAME;
*/
