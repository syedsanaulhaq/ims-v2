-- Clear all verification data from the database
-- Delete all records from inventory_verification_requests table

DELETE FROM inventory_verification_requests;

PRINT '✅ All verification requests deleted from inventory_verification_requests table'
PRINT '📊 You can now create a new verification request to test the page'
PRINT '📋 Total records deleted: (see message above)'
