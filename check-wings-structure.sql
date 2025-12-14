-- Check what wings reference exists elsewhere
PRINT '=== CHECKING WING REFERENCES ===';

-- Check DEC_MST table (Department structure)
SELECT DISTINCT DEC_ID, DEC_NAME FROM DEC_MST LIMIT 10;

-- Check if there's a tblOffices or similar
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%wing%' OR TABLE_NAME LIKE '%office%' OR TABLE_NAME LIKE '%department%';

-- Check current structure for offices
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tblOffices')
BEGIN
    PRINT 'tblOffices exists:';
    SELECT * FROM tblOffices LIMIT 5;
END;

-- Check DEC_MST structure  
PRINT 'DEC_MST structure:';
SELECT * FROM DEC_MST LIMIT 5;

-- Check all tables that might have wing_id reference
PRINT 'Tables with wing references:';
SELECT DISTINCT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE COLUMN_NAME = 'wing_id';

-- Check inventory_verification_requests structure
PRINT 'inventory_verification_requests columns:';
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_verification_requests' ORDER BY ORDINAL_POSITION;
