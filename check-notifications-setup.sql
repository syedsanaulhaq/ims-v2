-- Check if Notifications table exists
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications')
    PRINT '✓ Notifications table exists'
ELSE
    PRINT '✗ Notifications table does NOT exist'

-- Check if GetUserNotifications stored procedure exists
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'GetUserNotifications')
    PRINT '✓ GetUserNotifications stored procedure exists'
ELSE
    PRINT '✗ GetUserNotifications stored procedure does NOT exist'

-- Count notifications
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Notifications')
BEGIN
    SELECT 
        COUNT(*) as TotalNotifications,
        SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as UnreadNotifications,
        SUM(CASE WHEN Type = 'info' THEN 1 ELSE 0 END) as InfoNotifications,
        SUM(CASE WHEN Type = 'VERIFICATION_COMPLETE' THEN 1 ELSE 0 END) as VerificationNotifications
    FROM Notifications;

    -- Show last 5 notifications
    SELECT TOP 5
        Id,
        UserId,
        Title,
        LEFT(Message, 50) as MessagePreview,
        Type,
        IsRead,
        CreatedAt
    FROM Notifications
    ORDER BY CreatedAt DESC;
END
