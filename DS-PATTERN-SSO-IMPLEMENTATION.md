# Simple Token-Based SSO Implementation (DS → IMS)
## Using Existing DS Pattern (No JWT Changes Required!)

---

## 🎯 Overview

DS already has a working pattern for integrating with external systems (EMCC). We'll use the **EXACT SAME PATTERN** for IMS integration - no need to change DS's JWT configuration!

### How It Works:

```
DS System (User Logged In)
    ↓
    Store CNIC + Password in Session
    ↓
    Click "IMS Admin" Link
    ↓
    Call IMS Authentication API
    ↓
    IMS validates credentials and returns token
    ↓
    Redirect to IMS with token
    ↓
    IMS auto-login with token
```

---

## 📝 FOR DS TEAM (.NET Core) - Minimal Changes!

### Step 1: Add IMS URL to `appsettings.json`

Just add one line to your existing configuration:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=SYED-FAZLI-LAPT;Database=DigitalSystemDB;..."
  },
  
  "Jwt": {
    "Key": "mysuperlongsecretkeythatneedstobelongenough123!",
    "Issuer": "https://mrs.ecp.gov.pk",
    "Audience": "https://mrs.ecp.gov.pk"
  },
  
  // ⬇️ ADD THIS LINE ⬇️
  "IMSUrl": "http://localhost:5173",
  
  "EMCCUrl": "https://emcc.example.com"
}
```

---

### Step 2: Create IMS Controller (Copy EMCC Pattern)

Create `Controllers/IMSController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using ECPPMU.Web.Helper; // Your existing API_HelperII class
using Newtonsoft.Json.Linq;
using System;
using Microsoft.Extensions.Logging;
using System.Net.Mail;

namespace ECPPMU.Web.Controllers
{
    public class IMSController : Controller
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<IMSController> _logger;

        public IMSController(IConfiguration configuration, ILogger<IMSController> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        [ServiceFilter(typeof(SessionExpireFilterAttribute))]
        public async Task<IActionResult> GoToIMS()
        {
            try
            {
                string cnic = HttpContext.Session.GetString("CNIC");
                string password = HttpContext.Session.GetString("Pwd");
                string imsUrl = _configuration["IMSUrl"]; // URL of IMS application

                if (string.IsNullOrEmpty(cnic) || string.IsNullOrEmpty(password))
                {
                    return BadRequest("Missing CNIC or password in session.");
                }

                // Call IMS authentication API
                var apiHelper = new API_HelperII(_configuration["IMSUrl"]);
                var loginRequest = new { CNIC = cnic, Password = password };
                string data = Newtonsoft.Json.JsonConvert.SerializeObject(loginRequest);
                
                // IMS authentication endpoint
                var (response, statusCode) = await apiHelper.PostAsync("/api/auth/ds-authenticate", string.Empty, data);

                string responseText = response.ToString();

                if (statusCode == 200)
                {
                    // Check if the response contains an error message
                    if (responseText.Contains("Invalid CNIC or password") || 
                        responseText.Contains("User not found") ||
                        responseText.Contains("Authentication failed"))
                    {
                        _logger.LogWarning($"IMS authentication failed for CNIC: {cnic}");
                        return Unauthorized("Authentication failed. Invalid CNIC or password.");
                    }

                    // Deserialize token response
                    try
                    {
                        var tokenResponse = response.ToObject<TokenResponse>();

                        if (string.IsNullOrEmpty(tokenResponse?.Token))
                        {
                            _logger.LogError($"IMS authentication failed - token was null or empty.\n\nAPI Response: {responseText}");
                            return Unauthorized("Authentication failed.");
                        }

                        // Redirect to IMS with token (same pattern as EMCC)
                        return Redirect($"{imsUrl}/sso-login?token={tokenResponse.Token}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to deserialize IMS token response. API response:\n{responseText}");
                        return StatusCode(500, "Invalid response format from IMS API.");
                    }
                }
                else
                {
                    _logger.LogError($"IMS API returned unexpected status code: {statusCode}\n\nResponse: {responseText}");
                    return StatusCode((int)statusCode, "Unexpected error from IMS API.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred in GoToIMS");
                return StatusCode(500, "Internal server error occurred.");
            }
        }
    }

    public class TokenResponse
    {
        public string Token { get; set; }
    }
}
```

---

### Step 3: Add Navigation Link (Same as EMCC)

In your navigation menu (e.g., `_Layout.cshtml`):

```html
<li class="nav-item">
    <a class="nav-link" asp-controller="IMS" asp-action="GoToIMS">
        <i class="fas fa-boxes"></i> IMS Admin
    </a>
</li>
```

---

### ✅ That's It for DS Team! Only 3 Changes:

1. ✅ Add `"IMSUrl"` to `appsettings.json`
2. ✅ Create `IMSController.cs` (copy EMCC pattern)
3. ✅ Add navigation link

**No JWT changes, no new services, same pattern they already use!**

---

## 🎯 FOR IMS TEAM (You - Node.js)

### Step 1: Create DS Authentication Endpoint

Add this to `backend-server.cjs` (around line 7220, after existing auth endpoints):

```javascript
// ============================================================================
// DS-Style Token Authentication (Compatible with DS's EMCC Pattern)
// ============================================================================

app.post('/api/auth/ds-authenticate', async (req, res) => {
  console.log('🔐 DS Authentication Request Received');
  
  try {
    const { CNIC, Password } = req.body;
    
    if (!CNIC || !Password) {
      console.log('❌ Missing CNIC or Password');
      return res.status(400).json({
        success: false,
        message: 'Missing CNIC or password'
      });
    }

    console.log(`🔍 Authenticating user with CNIC: ${CNIC}`);

    // Query user from AspNetUsers by CNIC
    const userResult = await pool.request()
      .input('cnic', sql.NVarChar, CNIC)
      .query(`
        SELECT 
          Id,
          FullName,
          CNIC,
          FatherOrHusbandName,
          UserName,
          Email,
          PhoneNumber,
          PasswordHash,
          intOfficeID,
          intWingID,
          intProvinceID,
          intDivisionID,
          intDistrictID,
          intBranchID,
          intDesignationID,
          Role,
          UID,
          ISACT,
          Gender,
          ProfilePhoto,
          LastLoggedIn
        FROM AspNetUsers 
        WHERE CNIC = @cnic AND ISACT = 1
      `);

    if (userResult.recordset.length === 0) {
      console.log('❌ User not found or inactive');
      return res.status(401).json({
        success: false,
        message: 'Invalid CNIC or password'
      });
    }

    const user = userResult.recordset[0];
    console.log(`✅ User found: ${user.FullName} (${user.UserName})`);

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(Password, user.PasswordHash);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid CNIC or password'
      });
    }

    console.log('✅ Password verified successfully');

    // Update last login time
    await pool.request()
      .input('user_id', sql.NVarChar(450), user.Id)
      .input('last_login', sql.DateTime2, new Date())
      .query(`
        UPDATE AspNetUsers 
        SET LastLoggedIn = @last_login 
        WHERE Id = @user_id
      `);

    // Generate JWT token (same format as before)
    const token = jwt.sign(
      {
        sub: user.Id,
        unique_name: user.UserName,
        email: user.Email,
        full_name: user.FullName,
        cnic: user.CNIC,
        office_id: user.intOfficeID,
        wing_id: user.intWingID,
        province_id: user.intProvinceID,
        division_id: user.intDivisionID,
        district_id: user.intDistrictID,
        branch_id: user.intBranchID,
        designation_id: user.intDesignationID,
        role: user.Role,
        uid: user.UID,
        is_active: user.ISACT,
        gender: user.Gender
      },
      JWT_SECRET,
      {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: '24h'
      }
    );

    console.log('✅ Token generated successfully');

    // Return token (same format as EMCC API)
    res.status(200).json({
      Token: token, // Capital 'T' to match DS's TokenResponse class
      success: true,
      message: 'Authentication successful'
    });

  } catch (error) {
    console.error('❌ DS Authentication Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

console.log('✅ DS-Style Authentication endpoint loaded: POST /api/auth/ds-authenticate');
```

---

### Step 2: Update `.env.sqlserver` (Already Done!)

Your existing configuration is perfect:

```env
# JWT Configuration for SSO
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

**No changes needed!**

---

### Step 3: Frontend Already Ready!

Your existing `SSOLogin.tsx` component will work perfectly - it already handles the token from the URL and validates it!

**No frontend changes needed!**

---

## 🔄 Complete Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ DS System - User Already Logged In                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Session Storage:                                               │
│   CNIC = "12345-6789012-3"                                    │
│   Password = "UserPassword123"                                │
│                                                                │
│ User clicks: "IMS Admin" link                                  │
│                                                                │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ DS: IMSController.GoToIMS()                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. Get CNIC and Password from session                          │
│ 2. Call IMS API:                                               │
│    POST http://localhost:5173/api/auth/ds-authenticate        │
│    Body: { "CNIC": "12345-6789012-3",                         │
│            "Password": "UserPassword123" }                     │
│                                                                │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ IMS Backend: /api/auth/ds-authenticate                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. Receive CNIC and Password                                   │
│ 2. Query AspNetUsers:                                          │
│    SELECT * FROM AspNetUsers                                   │
│    WHERE CNIC = '12345-6789012-3' AND ISACT = 1               │
│                                                                │
│ 3. Verify password using bcrypt:                               │
│    bcrypt.compare(Password, user.PasswordHash)                │
│                                                                │
│ 4. Generate JWT token with user data                           │
│                                                                │
│ 5. Return response:                                            │
│    {                                                           │
│      "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",      │
│      "success": true,                                          │
│      "message": "Authentication successful"                    │
│    }                                                           │
│                                                                │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ DS: Receives Token Response                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ var tokenResponse = response.ToObject<TokenResponse>();       │
│ // tokenResponse.Token = "eyJhbGci..."                        │
│                                                                │
│ Redirect:                                                      │
│   http://localhost:5173/sso-login?token=eyJhbGci...          │
│                                                                │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ IMS Frontend: SSOLogin.tsx                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. Extract token from URL                                      │
│ 2. Call validation endpoint (already exists!)                  │
│ 3. Store user session                                          │
│ 4. Redirect to dashboard                                       │
│                                                                │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│ IMS Dashboard - User Logged In! ✅                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

### Password Handling

**DS Side:**
- Password already in session (user already authenticated in DS)
- Sent over HTTPS in production
- Never logged or stored

**IMS Side:**
- Password verified against `PasswordHash` using bcrypt
- Password NOT stored in token
- Token contains user ID and profile data only

### Token Security

- JWT signed with secret key
- Expires in 24 hours
- Contains user data (no password)
- Validated on every IMS page load

---

## 🧪 Testing Instructions

### Step 1: Test IMS Authentication Endpoint Directly

Using PowerShell (test with your real user):

```powershell
$body = @{
    CNIC = "12345-6789012-3"  # Replace with real CNIC
    Password = "YourPassword"  # Replace with real password
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/ds-authenticate" -Method Post -Body $body -ContentType "application/json"

Write-Host "Token received:" $response.Token.Substring(0, 50)"..."
```

**Expected Response:**
```json
{
  "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "success": true,
  "message": "Authentication successful"
}
```

---

### Step 2: Test Complete Flow

1. **Start IMS Backend:**
   ```powershell
   node backend-server.cjs
   ```
   Look for: `✅ DS-Style Authentication endpoint loaded`

2. **Start IMS Frontend:**
   ```powershell
   npm run dev
   ```

3. **DS Team Implements:**
   - Add `IMSController.cs`
   - Add navigation link
   - Test: Click "IMS Admin"

4. **Verify:**
   - Should redirect to IMS
   - Should auto-login
   - Should show user dashboard

---

## 📊 Comparison: JWT vs DS Pattern

| Feature | Original JWT Plan | DS Pattern (This Approach) |
|---------|------------------|---------------------------|
| **DS Changes** | Medium (3 new files) | Minimal (1 controller) |
| **IMS Changes** | Medium | Minimal (1 endpoint) |
| **Password Check** | No | Yes (more secure!) |
| **Token Type** | JWT | JWT (same!) |
| **DS Team Familiar** | ❌ New pattern | ✅ Same as EMCC |
| **Security** | Good | Better (validates password) |
| **Complexity** | Medium | Low |

---

## ✅ Advantages of DS Pattern

1. **✅ Minimal DS Changes** - They copy existing EMCC pattern
2. **✅ Familiar to DS Team** - Same code they already use
3. **✅ Better Security** - Actually validates password, not just trusts DS
4. **✅ No JWT Configuration Changes** - Keeps their existing JWT setup
5. **✅ Proven Pattern** - Already working with EMCC integration
6. **✅ Single Point of Authentication** - IMS controls who can login

---

## 🚀 Implementation Checklist

### IMS Team (You):

- [ ] Add `/api/auth/ds-authenticate` endpoint to `backend-server.cjs`
- [ ] Test endpoint with PowerShell script
- [ ] Verify password hashing works (bcrypt)
- [ ] Restart backend server

### DS Team:

- [ ] Add `"IMSUrl"` to `appsettings.json`
- [ ] Create `Controllers/IMSController.cs` (copy from this document)
- [ ] Add "IMS Admin" navigation link
- [ ] Test: Click link and verify redirect

### Both Teams:

- [ ] Test end-to-end SSO flow
- [ ] Verify user data loads correctly in IMS
- [ ] Test with multiple users
- [ ] Test error scenarios (wrong password, inactive user)

---

## 🎯 Summary

**This approach is BETTER because:**

1. DS team uses pattern they already know (EMCC integration)
2. No changes to DS's JWT configuration
3. More secure (validates actual password)
4. Simpler to implement
5. Easier to maintain

**The only difference from EMCC:**
- EMCC URL → IMS URL
- EMCC API → IMS API (`/api/auth/ds-authenticate`)
- Same redirect pattern, same token handling!

**DS team will love this because they literally copy-paste their EMCC code and change 3 words! 🎉**
