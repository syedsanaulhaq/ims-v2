-- Check if any proposal documents have been uploaded
USE InventoryManagementDB;
GO

SELECT 
    tv.id,
    tv.vendor_name,
    tv.proposal_document_name,
    tv.proposal_document_path,
    tv.proposal_upload_date,
    tv.proposal_file_size,
    t.title as tender_title,
    t.tender_number
FROM tender_vendors tv
LEFT JOIN tenders t ON tv.tender_id = t.id
WHERE tv.proposal_document_name IS NOT NULL
ORDER BY tv.proposal_upload_date DESC;

-- If no results, check all vendors for the recent tender
SELECT TOP 10
    tv.vendor_name,
    tv.proposal_document_name,
    tv.proposal_upload_date,
    tv.created_at,
    t.title as tender_title
FROM tender_vendors tv
LEFT JOIN tenders t ON tv.tender_id = t.id
ORDER BY tv.created_at DESC;
