-- Check what notifications exist for this user
SELECT 
    Id,
    Title,
    LEFT(Message, 100) as MessagePreview,
    Type,
    ActionUrl,
    ActionText,
    IsRead,
    CreatedAt
FROM Notifications
WHERE UserId = '4dae06b7-17cd-480b-81eb-da9c76ad5728'
ORDER BY CreatedAt DESC;

-- Check if any are verification notifications
SELECT 
    COUNT(*) as TotalCount,
    SUM(CASE WHEN Title LIKE '%Verification%' THEN 1 ELSE 0 END) as VerificationCount,
    SUM(CASE WHEN Type = 'info' THEN 1 ELSE 0 END) as InfoTypeCount,
    SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) as UnreadCount
FROM Notifications
WHERE UserId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';
