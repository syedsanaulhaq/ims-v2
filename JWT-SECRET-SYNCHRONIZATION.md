# JWT Secret Synchronization Guide

## ⚠️ CRITICAL: Both Systems Must Use Same Secret

For SSO to work, **DS and IMS must use the EXACT SAME JWT_SECRET**.

---

## 🔑 Current Configuration

### IMS Server (Node.js) - `.env.sqlserver`

```env
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

**Location:** `e:\ECP-Projects\inventory-management-system-ims\ims-v1\.env.sqlserver`

---

### DS Server (.NET Core) - `appsettings.json`

```json
{
  "Jwt": {
    "Secret": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS",
    "ExpiryInHours": 24
  }
}
```

**Location:** Your DS project's `appsettings.json`

---

## 🔐 How JWT Token Verification Works

### Step 1: DS Generates Token

```csharp
// DS Server (C#)
var securityKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes("YourVerySecureSecretKeyAtLeast32CharactersLong123456")
);

var token = new JwtSecurityToken(
    issuer: "DigitalSystem",
    audience: "IMS",
    claims: claims,
    expires: DateTime.UtcNow.AddHours(24),
    signingCredentials: new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256)
);

// Token signed with SECRET: "YourVerySecureSecretKeyAtLeast32CharactersLong123456"
// Result: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZGFlMDZiNy0xN2...SIGNATURE_ABC123
```

---

### Step 2: IMS Validates Token

```javascript
// IMS Server (Node.js)
const jwt = require('jsonwebtoken');

const JWT_SECRET = "YourVerySecureSecretKeyAtLeast32CharactersLong123456";

try {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: 'DigitalSystem',
    audience: 'IMS'
  });
  
  // ✅ Signature matches! Token is valid!
  console.log('User ID:', decoded.sub);
  
} catch (error) {
  // ❌ Signature mismatch! Token is invalid!
  console.error('Invalid token:', error.message);
}
```

---

## 🎯 What Happens If Secrets Don't Match?

### ❌ Scenario 1: Different Secrets

```
DS Secret:  "SecretKeyForDS123456789012345678"
IMS Secret: "DifferentSecretForIMS123456789012"

Result: ❌ JWT verification FAILS
Error: "invalid signature"
User cannot login to IMS
```

---

### ❌ Scenario 2: Typo in Secret

```
DS Secret:  "YourVerySecureSecretKeyAtLeast32CharactersLong123456"
IMS Secret: "YourVerySecureSecretKeyAtLeast32CharactersLong12345"
                                                           ↑ Missing '6'

Result: ❌ JWT verification FAILS
Error: "invalid signature"
```

---

### ✅ Scenario 3: Exact Match (CORRECT)

```
DS Secret:  "YourVerySecureSecretKeyAtLeast32CharactersLong123456"
IMS Secret: "YourVerySecureSecretKeyAtLeast32CharactersLong123456"

Result: ✅ JWT verification SUCCESS
User logs in successfully
```

---

## 🔍 Visual Explanation

```
┌──────────────────────────────────────────────────────────────┐
│ DS Server (Token Generation)                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ User Data + Secret Key = Token with Signature                │
│                                                              │
│ ┌────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│ │ User Info  │ + │ JWT_SECRET   │ = │ Signed Token     │   │
│ │ (Claims)   │   │ "YourVery..."│   │ eyJhbGciOi...    │   │
│ └────────────┘   └──────────────┘   └──────────────────┘   │
│                          │                                   │
│                          │ Secret creates unique signature   │
│                          ↓                                   │
│                  SIGNATURE_ABC123                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Token sent to IMS
                              ↓
┌──────────────────────────────────────────────────────────────┐
│ IMS Server (Token Validation)                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Token Signature + Secret Key = Valid or Invalid?             │
│                                                              │
│ ┌──────────────────┐   ┌──────────────┐   ┌─────────────┐  │
│ │ Token            │ + │ JWT_SECRET   │ = │ Verification │  │
│ │ SIGNATURE_ABC123 │   │ "YourVery..."│   │ ✅ MATCH!    │  │
│ └──────────────────┘   └──────────────┘   └─────────────┘  │
│                                                              │
│ If secrets match:                                            │
│   ✅ Signature recalculated = SIGNATURE_ABC123               │
│   ✅ Matches original signature                              │
│   ✅ Token is valid!                                         │
│                                                              │
│ If secrets DON'T match:                                      │
│   ❌ Signature recalculated = SIGNATURE_XYZ789               │
│   ❌ Does NOT match original signature                       │
│   ❌ Token is INVALID!                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 Verification Checklist

Before deploying SSO, verify:

### ✅ 1. Check IMS Secret

```powershell
# In your IMS project directory
Get-Content .env.sqlserver | Select-String "JWT_SECRET"
```

**Expected Output:**
```
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

---

### ✅ 2. Check DS Secret

```powershell
# In your DS project directory
Get-Content appsettings.json | Select-String -Pattern "Secret" -Context 0,1
```

**Expected Output:**
```json
"Secret": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
```

---

### ✅ 3. Compare Secrets

```powershell
# Extract and compare
$imsSecret = (Get-Content .env.sqlserver | Select-String "JWT_SECRET").ToString().Split('=')[1]
$dsSecret = (Get-Content appsettings.json | ConvertFrom-Json).Jwt.Secret

if ($imsSecret -eq $dsSecret) {
    Write-Host "✅ Secrets MATCH! SSO will work." -ForegroundColor Green
} else {
    Write-Host "❌ Secrets DON'T MATCH! SSO will FAIL!" -ForegroundColor Red
    Write-Host "IMS: $imsSecret"
    Write-Host "DS:  $dsSecret"
}
```

---

## 🛠️ How to Synchronize Secrets

### Option 1: Update DS to Match IMS

```json
// DS: appsettings.json
{
  "Jwt": {
    "Secret": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    ↑
    Copy this EXACT value from IMS .env.sqlserver
  }
}
```

---

### Option 2: Update IMS to Match DS

```env
# IMS: .env.sqlserver
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
           ↑
           Copy this EXACT value from DS appsettings.json
```

---

### Option 3: Generate New Secret (For Both)

```powershell
# Generate a secure random secret
$bytes = New-Object Byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "New Secret: $secret"
```

**Then update BOTH systems with the same new secret.**

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Extra Spaces

```env
# WRONG - Extra space after secret
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456 
                                                                ↑

# CORRECT - No spaces
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

---

### ❌ Mistake 2: Different Encoding

```csharp
// DS using ASCII
Encoding.ASCII.GetBytes(secret)

// IMS using UTF8
Encoding.UTF8.GetBytes(secret)

// Result: Different byte arrays = Different signatures ❌
```

**Solution:** Both should use UTF8 encoding (default in Node.js `jsonwebtoken` library).

---

### ❌ Mistake 3: Environment-Specific Secrets

```json
// DS: appsettings.Development.json
"Secret": "DevSecretKey123"

// DS: appsettings.Production.json
"Secret": "ProdSecretKey456"

// Result: Secret changes between environments ❌
```

**Solution:** Keep secret consistent across environments, or sync IMS secret based on DS environment.

---

## 🔒 Security Best Practices

### 1. Minimum Length

```
✅ Good:  "YourVerySecureSecretKeyAtLeast32CharactersLong123456" (54 chars)
⚠️  Weak:  "MySecret123" (11 chars)
❌ Bad:   "12345" (5 chars)
```

**Recommendation:** Minimum 32 characters

---

### 2. Randomness

```
✅ Good:  "K7#mP9$nQ2@wX5&vR8!tY3^jL6*bN1+cM4"
⚠️  Weak:  "MySecretKey123456789012345678901234"
❌ Bad:   "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

**Recommendation:** Use cryptographically secure random generation

---

### 3. Never Commit to Git

```bash
# .gitignore
.env.sqlserver
appsettings.json
appsettings.*.json
```

---

### 4. Use Environment Variables

```csharp
// DS: Better approach
var secret = Environment.GetEnvironmentVariable("JWT_SECRET") 
    ?? Configuration["Jwt:Secret"];
```

```javascript
// IMS: Already using .env file ✅
const JWT_SECRET = process.env.JWT_SECRET;
```

---

## 🧪 Testing Secret Synchronization

### Test Script (Node.js)

Create `test-jwt-sync.cjs`:

```javascript
const jwt = require('jsonwebtoken');

const DS_SECRET = "YourVerySecureSecretKeyAtLeast32CharactersLong123456";
const IMS_SECRET = "YourVerySecureSecretKeyAtLeast32CharactersLong123456";

// DS generates token
const token = jwt.sign(
  { sub: "test-user-123", name: "Test User" },
  DS_SECRET,
  { issuer: "DigitalSystem", audience: "IMS", expiresIn: "24h" }
);

console.log("Token generated by DS:", token.substring(0, 50) + "...");

// IMS validates token
try {
  const decoded = jwt.verify(token, IMS_SECRET, {
    issuer: "DigitalSystem",
    audience: "IMS"
  });
  
  console.log("✅ SUCCESS! Token verified by IMS");
  console.log("User ID:", decoded.sub);
  console.log("User Name:", decoded.name);
  
} catch (error) {
  console.log("❌ FAILURE! Token verification failed");
  console.log("Error:", error.message);
}
```

**Run:**
```powershell
node test-jwt-sync.cjs
```

**Expected Output:**
```
Token generated by DS: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...
✅ SUCCESS! Token verified by IMS
User ID: test-user-123
User Name: Test User
```

---

## 📊 Summary

| Component | Location | Secret Format |
|-----------|----------|---------------|
| **DS Server** | `appsettings.json` → `Jwt:Secret` | String value |
| **IMS Server** | `.env.sqlserver` → `JWT_SECRET` | String value |
| **Must Match** | ✅ YES | Character-for-character |
| **Encoding** | UTF-8 | Both systems |
| **Min Length** | 32+ characters | Recommended |

---

## 🎯 Final Answer

**Q: Will tokens match between DS and IMS?**

**A:** Yes, tokens will match (be valid) **IF AND ONLY IF**:

1. ✅ Both use the **exact same JWT_SECRET** (character-for-character)
2. ✅ Both use the **same encoding** (UTF-8)
3. ✅ Token has **not expired** (within 24 hours)
4. ✅ Issuer is `"DigitalSystem"`
5. ✅ Audience is `"IMS"`

If any of these don't match, JWT verification will fail with "invalid signature" error.

**Current Status:**
- Both configured with: `"YourVerySecureSecretKeyAtLeast32CharactersLong123456"`
- ✅ Will work correctly once DS implements the code

**Before Production:**
- 🔄 Change to a strong, random secret
- 🔒 Store in secure environment variables
- 🚫 Never commit secrets to Git
