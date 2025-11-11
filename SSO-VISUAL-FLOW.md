# SSO Visual Flow - Complete Journey

## 📋 Your AspNetUsers Table Structure

```sql
[Id] nvarchar(450) PRIMARY KEY          -- User GUID
[FullName] nvarchar(max)                -- Complete name
[FatherOrHusbandName] nvarchar(max)     
[CNIC] nvarchar(max)                    -- National ID
[UserName] nvarchar(256)                -- Login username
[Email] nvarchar(256)
[PhoneNumber] nvarchar(max)
[Role] nvarchar(max)                    -- User role
[ProfilePhoto] nvarchar(max)            -- Photo URL
[UID] int                               -- Numeric user ID
[intProvinceID] int                     -- Province
[intDivisionID] int                     -- Division
[intDistrictID] int                     -- District
[intOfficeID] int                       -- Office
[intWingID] int                         -- Wing
[intBranchID] int                       -- Branch
[intDesignationID] int                  -- Designation
[Gender] int                            -- 0=Female, 1=Male
[ISACT] bit                             -- 1=Active, 0=Inactive
[LastLoggedIn] datetime
... (+ ASP.NET Identity fields)
```

---

## 🔄 Complete SSO Flow

### Step 1: User Starts in DS (Digital System)

```
┌─────────────────────────────────────────────────────────────┐
│ Digital System (DS) - .NET Core                             │
│ Database: DigitalSystemDB                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: Syed Fazal Hussain                                  │
│  Logged in with: Username + Password                        │
│                                                             │
│  [Dashboard]  [Inventory]  [Reports]  [IMS-Admin] ←───    │
│                                          ↑                  │
│                                          │                  │
│                                    User clicks here         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 2: DS Generates JWT Token

```
┌─────────────────────────────────────────────────────────────┐
│ DS Backend: JwtTokenService.GenerateToken(user)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Input: User from AspNetUsers table                         │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Id: "4dae06b7-17cd-480b-81eb-da9c76ad5728"          │   │
│ │ UserName: "syed.fazal"                               │   │
│ │ FullName: "Syed Fazal Hussain"                       │   │
│ │ CNIC: "12345-6789012-3"                              │   │
│ │ Email: "syed.fazal@example.com"                      │   │
│ │ PhoneNumber: "+92300123456"                          │   │
│ │ Role: "Admin"                                        │   │
│ │ intOfficeID: 583                                     │   │
│ │ intWingID: 19                                        │   │
│ │ intBranchID: 5                                       │   │
│ │ intDesignationID: 12                                 │   │
│ │ intProvinceID: 1                                     │   │
│ │ intDivisionID: 3                                     │   │
│ │ intDistrictID: 7                                     │   │
│ │ UID: 101                                             │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ↓                                                           │
│                                                             │
│ Creates JWT Claims:                                         │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ {                                                    │   │
│ │   "sub": "4dae06b7-17cd-480b-81eb-da9c76ad5728",   │   │
│ │   "unique_name": "syed.fazal",                      │   │
│ │   "email": "syed.fazal@example.com",                │   │
│ │   "full_name": "Syed Fazal Hussain",                │   │
│ │   "cnic": "12345-6789012-3",                        │   │
│ │   "phone_number": "+92300123456",                   │   │
│ │   "role": "Admin",                                  │   │
│ │   "office_id": "583",                               │   │
│ │   "wing_id": "19",                                  │   │
│ │   "branch_id": "5",                                 │   │
│ │   "designation_id": "12",                           │   │
│ │   "province_id": "1",                               │   │
│ │   "division_id": "3",                               │   │
│ │   "district_id": "7",                               │   │
│ │   "uid": "101",                                     │   │
│ │   "exp": 1699650800,  ← Token expires in 24 hours  │   │
│ │   "iss": "DigitalSystem",                           │   │
│ │   "aud": "IMS"                                      │   │
│ │ }                                                    │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ↓                                                           │
│                                                             │
│ Signs with JWT_SECRET:                                      │
│ "YourVerySecureSecretKeyAtLeast32CharactersLong123456"     │
│                                                             │
│ ↓                                                           │
│                                                             │
│ Output: JWT Token                                           │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0  │   │
│ │ ZGFlMDZiNy0xN2NkLTQ4MGItODFlYi1kYTljNzZhZDU3Mjgi  │   │
│ │ LCJ1bmlxdWVfbmFtZSI6InN5ZWQuZmF6YWwiLCJlbWFpbCI6  │   │
│ │ InN5ZWQuZmF6YWxAZXhhbXBsZS5jb20iLCJmdWxsX25hbWUi  │   │
│ │ OiJTeWVkIEZhemFsIEh1c3NhaW4iLCJjbmljIjoiMTIzNDUt  │   │
│ │ Njc4OTAxMi0zIiwicGhvbmVfbnVtYmVyIjoiKzkyMzAwMTIz  │   │
│ │ NDU2Iiwicm9sZSI6IkFkbWluIiwib2ZmaWNlX2lkIjoiNTgz  │   │
│ │ Iiwid2luZ19pZCI6IjE5IiwiYnJhbmNoX2lkIjoiNSIsImRl  │   │
│ │ c2lnbmF0aW9uX2lkIjoiMTIiLCJwcm92aW5jZV9pZCI6IjEi  │   │
│ │ LCJkaXZpc2lvbl9pZCI6IjMiLCJkaXN0cmljdF9pZCI6Ijci  │   │
│ │ LCJ1aWQiOiIxMDEiLCJleHAiOjE2OTk2NTA4MDAsImlzcyI6  │   │
│ │ IkRpZ2l0YWxTeXN0ZW0iLCJhdWQiOiJJTVMifQ.signature  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 3: DS Redirects to IMS

```
┌─────────────────────────────────────────────────────────────┐
│ DS Backend: SSO Controller                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  string redirectUrl = $"{imsUrl}/sso-login?token={token}"; │
│                                                             │
│  return Redirect(redirectUrl);                              │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Browser redirects to:
                       │
                       ↓
    http://localhost:5173/sso-login?token=eyJhbGciOi...
                       │
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ IMS Frontend: React App                                     │
│ Component: SSOLogin.tsx                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Loading Spinner]                                          │
│  "Authenticating from Digital System..."                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 4: IMS Frontend Validates Token

```
┌─────────────────────────────────────────────────────────────┐
│ IMS Frontend: SSOLogin.tsx                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  const token = searchParams.get('token');                   │
│  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...                │
│                                                             │
│  Sends POST request to backend:                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ POST http://localhost:3001/api/auth/sso-validate    │   │
│  │ Body: {                                             │   │
│  │   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ IMS Backend: backend-server.cjs                             │
│ Endpoint: POST /api/auth/sso-validate                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1: Verify JWT Token Signature                          │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ const decoded = jwt.verify(token, JWT_SECRET, {     │   │
│ │   issuer: 'DigitalSystem',                          │   │
│ │   audience: 'IMS'                                   │   │
│ │ });                                                  │   │
│ │                                                      │   │
│ │ ✅ Signature valid = Token came from DS             │   │
│ │ ✅ Not expired = Token still valid (< 24 hours)     │   │
│ │ ✅ Issuer matches = From correct source             │   │
│ │ ✅ Audience matches = Intended for IMS              │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Step 2: Extract User ID from Token                          │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ const userId = decoded.sub;                          │   │
│ │ // "4dae06b7-17cd-480b-81eb-da9c76ad5728"           │   │
│ │                                                      │   │
│ │ const userName = decoded.unique_name;                │   │
│ │ // "syed.fazal"                                      │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Step 3: Query IMS Database                                  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ SELECT                                               │   │
│ │   Id,                                                │   │
│ │   FullName,                                          │   │
│ │   CNIC,                                              │   │
│ │   UserName,                                          │   │
│ │   Email,                                             │   │
│ │   PhoneNumber,                                       │   │
│ │   Role,                                              │   │
│ │   ProfilePhoto,                                      │   │
│ │   UID,                                               │   │
│ │   intProvinceID,                                     │   │
│ │   intDivisionID,                                     │   │
│ │   intDistrictID,                                     │   │
│ │   intOfficeID,                                       │   │
│ │   intWingID,                                         │   │
│ │   intBranchID,                                       │   │
│ │   intDesignationID,                                  │   │
│ │   Gender,                                            │   │
│ │   ISACT                                              │   │
│ │ FROM AspNetUsers                                     │   │
│ │ WHERE Id = '4dae06b7-17cd-480b-81eb-da9c76ad5728'   │   │
│ │   AND ISACT = 1  ← Only active users                │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Database Result:                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ✅ User Found!                                       │   │
│ │                                                      │   │
│ │ Id: 4dae06b7-17cd-480b-81eb-da9c76ad5728            │   │
│ │ FullName: Syed Fazal Hussain                        │   │
│ │ UserName: syed.fazal                                │   │
│ │ Email: syed.fazal@example.com                       │   │
│ │ Role: Admin                                         │   │
│ │ intOfficeID: 583                                    │   │
│ │ intWingID: 19                                       │   │
│ │ ISACT: 1 (Active)                                   │   │
│ │ ... (all other fields)                              │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Step 4: Return Success Response                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ res.json({                                           │   │
│ │   success: true,                                     │   │
│ │   user: {                                            │   │
│ │     id: "4dae06b7-17cd-480b-81eb-da9c76ad5728",    │   │
│ │     username: "syed.fazal",                         │   │
│ │     full_name: "Syed Fazal Hussain",                │   │
│ │     cnic: "12345-6789012-3",                        │   │
│ │     email: "syed.fazal@example.com",                │   │
│ │     phone_number: "+92300123456",                   │   │
│ │     role: "Admin",                                  │   │
│ │     office_id: 583,                                 │   │
│ │     wing_id: 19,                                    │   │
│ │     branch_id: 5,                                   │   │
│ │     ... (all organizational IDs)                    │   │
│ │   },                                                 │   │
│ │   token: "eyJhbGciOi..."                            │   │
│ │ });                                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Response returns to frontend
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ IMS Frontend: SSOLogin.tsx                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Success Icon ✅]                                          │
│  "Login Successful!"                                        │
│  "Welcome, Syed Fazal Hussain"                              │
│                                                             │
│  Stores session:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ localStorage.setItem('auth_token', token);          │   │
│  │ localStorage.setItem('user', JSON.stringify(user)); │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Redirects to dashboard...                                  │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ IMS Dashboard                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Welcome, Syed Fazal Hussain! 👋                            │
│                                                             │
│  [Stock Issuance] [Inventory] [Reports] [Approvals]        │
│                                                             │
│  📊 Your user info available throughout the app:            │
│  • Role: Admin                                              │
│  • Office ID: 583                                           │
│  • Wing ID: 19                                              │
│  • All organizational hierarchy data                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Points

### What's NOT Being Checked:

❌ **Password** - NOT checked in IMS (DS already verified it)  
❌ **Token column in database** - Token is NOT stored in AspNetUsers  
❌ **Username/Password combination** - Already authenticated by DS

### What IS Being Checked:

✅ **JWT Signature** - Proves token came from DS (not tampered)  
✅ **Token Expiration** - Token valid for 24 hours  
✅ **User ID Exists** - User must exist in IMS AspNetUsers table  
✅ **User Active** - ISACT must be 1 (active user)  
✅ **Issuer & Audience** - Token from correct source, intended for IMS

---

## 🔐 Security Flow

```
┌───────────────────────────────────────────────────────────────┐
│ Security Checks (In Order)                                    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. JWT Signature Verification                                 │
│    ├─ Secret Key: YourVerySecureSecretKeyAtLeast32...        │
│    ├─ Algorithm: HS256                                        │
│    └─ Result: ✅ Token is authentic (came from DS)            │
│                                                               │
│ 2. Token Expiration Check                                     │
│    ├─ Token Created: 2025-11-09 10:00:00                     │
│    ├─ Token Expires: 2025-11-10 10:00:00 (24 hours)          │
│    ├─ Current Time: 2025-11-09 15:30:00                      │
│    └─ Result: ✅ Token still valid                            │
│                                                               │
│ 3. Issuer/Audience Verification                               │
│    ├─ Expected Issuer: "DigitalSystem"                       │
│    ├─ Token Issuer: "DigitalSystem" ✅                        │
│    ├─ Expected Audience: "IMS"                               │
│    ├─ Token Audience: "IMS" ✅                                │
│    └─ Result: ✅ Token from correct source                    │
│                                                               │
│ 4. User ID Extraction                                         │
│    ├─ Token Sub Claim: "4dae06b7-17cd-480b-81eb..."         │
│    └─ Result: ✅ User ID extracted                            │
│                                                               │
│ 5. Database Lookup                                            │
│    ├─ Query: SELECT * FROM AspNetUsers                       │
│    │         WHERE Id = '4dae06b7...' AND ISACT = 1          │
│    ├─ Result: 1 row found ✅                                  │
│    └─ User: Syed Fazal Hussain (Active)                      │
│                                                               │
│ 6. Session Creation                                           │
│    ├─ Store token in localStorage                            │
│    ├─ Store user info in localStorage                        │
│    └─ Result: ✅ User logged into IMS                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 💡 Common Scenarios

### ✅ Successful Login

```
User exists in DS → Token generated → User exists in IMS → Login ✅
```

### ❌ User Not Synced

```
User exists in DS → Token generated → User NOT in IMS → Error ❌
Solution: Run sync script → node sync-users-from-ds.cjs
```

### ❌ Token Expired

```
Token created 25 hours ago → Token expired → Error ❌
Solution: Login to DS again → New token generated
```

### ❌ Inactive User

```
User exists → ISACT = 0 → Error ❌
Solution: Activate user in DS → Sync to IMS
```

### ❌ Invalid Token

```
Token tampered/modified → Signature verification fails → Error ❌
Solution: Login to DS again
```

---

## 📊 Data Flow Summary

```
DS AspNetUsers (MASTER)
  ↓
  [Sync Script - Daily]
  ↓
IMS AspNetUsers (COPY)
  ↓
  [SSO Validation]
  ↓
IMS User Session
  ↓
IMS Dashboard
```

**Token Role:** Carries user ID securely from DS to IMS  
**Database Role:** Stores complete user profile for IMS operations  
**No Password Check:** DS already authenticated, IMS trusts the token

---

## 🎯 Summary

**Token is NOT in the database!**

The JWT token is a **signed message** that says:
> "User with ID 4dae06b7-17cd-480b-81eb-da9c76ad5728 authenticated in DS at 10:00 AM on Nov 9, 2025"

IMS:
1. Verifies the signature (proves message is genuine)
2. Extracts the User ID from the message
3. Looks up that User ID in AspNetUsers table
4. If found and active → User is logged in! ✅

No passwords checked, no token stored - just a secure handoff! 🔐
