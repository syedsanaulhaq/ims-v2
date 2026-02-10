-- Check password hash for user 1111111111111
SELECT 
  Id,
  UserName,
  FullName,
  CNIC,
  Password,
  PasswordHash,
  LEN(Password) as Password_Length,
  LEN(PasswordHash) as PasswordHash_Length,
  CASE 
    WHEN PasswordHash IS NULL THEN 'NULL'
    WHEN PasswordHash = '' THEN 'EMPTY'
    WHEN LEFT(PasswordHash, 3) = 'AQA' THEN 'ASP.NET Identity (Base64)'
    WHEN LEFT(PasswordHash, 2) = '$2' THEN 'Bcrypt'
    ELSE 'Plain text or Unknown'
  END as Hash_Type
FROM AspNetUsers 
WHERE UserName = '1111111111111' OR CNIC = '1111111111111';
