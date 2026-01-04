-- Auto-forward pending verifications to store keepers of the same wing
-- This script helps forward any unforwarded verifications to appropriate store keepers

PRINT '========================================='
PRINT 'Store Keeper Verification Auto-Forward'
PRINT '========================================='

-- Step 1: Find pending verifications that haven't been forwarded yet
PRINT ''
PRINT '1️⃣  PENDING UNFORWARDED VERIFICATIONS:'
SELECT 
  ivr.id,
  ivr.item_nomenclature,
  ivr.verification_status,
  ivr.requested_by_name,
  ivr.wing_id,
  ivr.wing_name,
  ivr.forwarded_to_user_id,
  ivr.created_at
FROM inventory_verification_requests ivr
WHERE ivr.forwarded_to_user_id IS NULL
  AND ivr.verification_status IN ('pending', 'forwarded')
ORDER BY ivr.created_at DESC

-- Step 2: Find Store Keepers by wing
PRINT ''
PRINT '2️⃣  STORE KEEPERS AVAILABLE BY WING:'
SELECT DISTINCT
  u.Id as user_id,
  u.UserName,
  u.FullName,
  u.intWingID as wing_id,
  w.strWingName as wing_name,
  r.role_name
FROM AspNetUsers u
LEFT JOIN Wings w ON u.intWingID = w.intWingID
JOIN ims_user_roles ur ON u.Id = ur.user_id
JOIN ims_roles r ON ur.role_id = r.id
WHERE r.role_name = 'CUSTOM_WING_STORE_KEEPER' AND ur.is_active = 1
ORDER BY u.intWingID, u.UserName

-- Step 3: Check which verifications need forwarding
PRINT ''
PRINT '3️⃣  VERIFICATION FORWARDING ANALYSIS:'
SELECT 
  ivr.id as verification_id,
  ivr.item_nomenclature,
  ivr.wing_id,
  ISNULL(ivr.forwarded_to_user_id, 'NOT FORWARDED') as current_forward_status,
  (SELECT TOP 1 u.Id FROM AspNetUsers u
   JOIN ims_user_roles ur ON u.Id = ur.user_id
   JOIN ims_roles r ON ur.role_id = r.id
   WHERE r.role_name = 'CUSTOM_WING_STORE_KEEPER' 
   AND u.intWingID = ivr.wing_id
   AND ur.is_active = 1) as recommended_store_keeper_id
FROM inventory_verification_requests ivr
WHERE ivr.forwarded_to_user_id IS NULL
  AND ivr.verification_status IN ('pending', 'forwarded')

-- Step 4: Manual forwarding template
-- If you need to manually forward a verification, use this template:
/*
UPDATE inventory_verification_requests
SET 
  verification_status = 'forwarded',
  forwarded_to_user_id = '{STORE_KEEPER_USER_ID}',
  forwarded_to_name = '{STORE_KEEPER_NAME}',
  forwarded_by_user_id = '{SUPERVISOR_USER_ID}',
  forwarded_by_name = '{SUPERVISOR_NAME}',
  forwarded_at = GETDATE(),
  forward_notes = 'Auto-forwarded to wing store keeper'
WHERE id = {VERIFICATION_ID}
*/

PRINT ''
PRINT '========================================='
PRINT 'Steps to Fix:'
PRINT '========================================='
PRINT '1. Note the verification_id from section 1️⃣'
PRINT '2. Find the store keeper for that wing in section 2️⃣'
PRINT '3. Use the forwarding template in section 4️⃣'
PRINT '4. Replace placeholders with actual values'
PRINT '5. Execute the UPDATE statement'
PRINT ''
PRINT 'OR use the Pending Verifications UI:'
PRINT '1. Go to /dashboard/pending-verifications'
PRINT '2. Select the verification'
PRINT '3. Click "Forward to Store Keeper"'
PRINT '4. Select the store keeper from the dropdown'
