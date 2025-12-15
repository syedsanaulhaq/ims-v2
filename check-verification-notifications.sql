-- Check if verification notifications exist in Notifications table
SELECT 
    n.Id,
    n.UserId,
    u.UserName,
    n.Title,
    LEFT(n.Message, 80) as MessagePreview,
    n.Type,
    n.ActionUrl,
    n.IsRead,
    n.CreatedAt
FROM Notifications n
LEFT JOIN AspNetUsers u ON n.UserId = u.Id
WHERE n.Title LIKE '%Verification%'
ORDER BY n.CreatedAt DESC;

PRINT '---';
PRINT 'Total verification notifications in database:';
SELECT COUNT(*) as VerificationNotificationCount
FROM Notifications
WHERE Title LIKE '%Verification%';

PRINT '---';
PRINT 'All notifications (last 20):';
SELECT TOP 20
    Id,
    UserId,
    Title,
    Type,
    CreatedAt
FROM Notifications
ORDER BY CreatedAt DESC;

PRINT '---';
PRINT 'Check if Notifications table exists and is accessible:';
SELECT 
    OBJECT_NAME(object_id) as TableName,
    type_desc as ObjectType
FROM sys.objects
WHERE name = 'Notifications';
