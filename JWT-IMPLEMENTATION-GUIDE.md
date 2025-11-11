# JWT Secret Key Implementation Instructions

## 🎯 FOR DS TEAM (.NET Core Team)

### Step 1: Add JWT Configuration to `appsettings.json`

Open your DS project's `appsettings.json` file and add this section:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=SYED-FAZLI-LAPT;Database=DigitalSystemDB;..."
  },
  
  // ⬇️ ADD THIS SECTION ⬇️
  "Jwt": {
    "Secret": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS",
    "ExpiryInHours": 24
  },
  
  "Logging": {
    ...
  }
}
```

### Step 2: Read JWT Configuration in Your Code

In your `JwtTokenService.cs`:

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;
    
    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }
    
    public string GenerateToken(
        string userId,
        string userName,
        string email,
        string fullName,
        string cnic,
        int? officeId,
        int? wingId,
        int? provinceId,
        int? divisionId,
        int? districtId,
        int? branchId,
        int? designationId,
        string role,
        int? uid,
        bool isActive,
        int? gender)
    {
        // ✅ Read JWT secret from appsettings.json
        var secretKey = _configuration["Jwt:Secret"];
        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        var expiryHours = int.Parse(_configuration["Jwt:ExpiryInHours"]);
        
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.UniqueName, userName),
            new Claim(JwtRegisteredClaimNames.Email, email ?? ""),
            new Claim("full_name", fullName ?? ""),
            new Claim("cnic", cnic ?? ""),
            new Claim("office_id", officeId?.ToString() ?? ""),
            new Claim("wing_id", wingId?.ToString() ?? ""),
            new Claim("province_id", provinceId?.ToString() ?? ""),
            new Claim("division_id", divisionId?.ToString() ?? ""),
            new Claim("district_id", districtId?.ToString() ?? ""),
            new Claim("branch_id", branchId?.ToString() ?? ""),
            new Claim("designation_id", designationId?.ToString() ?? ""),
            new Claim("role", role ?? ""),
            new Claim("uid", uid?.ToString() ?? ""),
            new Claim("is_active", isActive.ToString()),
            new Claim("gender", gender?.ToString() ?? "")
        };
        
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

### Step 3: Register Service in `Program.cs`

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add JWT Token Service
builder.Services.AddSingleton<JwtTokenService>();

// Other services...
builder.Services.AddControllersWithViews();
```

### Step 4: Use in SSO Controller

```csharp
// Controllers/SSOController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

[Authorize] // User must be logged into DS
public class SSOController : Controller
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwtService;
    private readonly IConfiguration _configuration;
    
    public SSOController(
        UserManager<ApplicationUser> userManager,
        JwtTokenService jwtService,
        IConfiguration configuration)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _configuration = configuration;
    }
    
    [HttpGet]
    public async Task<IActionResult> RedirectToIMS()
    {
        // Get currently logged-in user
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return RedirectToAction("Login", "Account");
        }
        
        // Generate JWT token with all user data
        var token = _jwtService.GenerateToken(
            userId: user.Id,
            userName: user.UserName,
            email: user.Email,
            fullName: user.FullName,
            cnic: user.CNIC,
            officeId: user.intOfficeID,
            wingId: user.intWingID,
            provinceId: user.intProvinceID,
            divisionId: user.intDivisionID,
            districtId: user.intDistrictID,
            branchId: user.intBranchID,
            designationId: user.intDesignationID,
            role: user.Role,
            uid: user.UID,
            isActive: user.ISACT,
            gender: user.Gender
        );
        
        // Redirect to IMS with token
        var imsUrl = "http://localhost:5173/sso-login";
        return Redirect($"{imsUrl}?token={token}");
    }
}
```

### Step 5: Add Navigation Link

In your DS navigation menu (e.g., `_Layout.cshtml` or navigation component):

```html
<li class="nav-item">
    <a class="nav-link" asp-controller="SSO" asp-action="RedirectToIMS">
        <i class="fas fa-boxes"></i> IMS Admin
    </a>
</li>
```

### ✅ DS Team Checklist

- [ ] Add `Jwt` section to `appsettings.json`
- [ ] Create `JwtTokenService.cs` class
- [ ] Create `SSOController.cs` with `RedirectToIMS` action
- [ ] Register `JwtTokenService` in `Program.cs`
- [ ] Add "IMS Admin" link to navigation menu
- [ ] Test: Click link should redirect to IMS with token

---

## 🎯 FOR IMS TEAM (You - Node.js Team)

### Step 1: Verify `.env.sqlserver` File

Your `.env.sqlserver` file should already have:

```env
# SQL Server Configuration
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433 
SQL_SERVER_ENCRYPT=false 
SQL_SERVER_TRUST_CERT=true 
PORT=3001

# DS Database Configuration (for user sync)
DS_SQL_SERVER_HOST=SYED-FAZLI-LAPT
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=inventorymanagementuser
DS_SQL_SERVER_PASSWORD=2016Wfp61@
DS_SQL_SERVER_PORT=1433

# JWT Configuration for SSO
# ⬇️ THIS MUST MATCH DS appsettings.json "Jwt:Secret" ⬇️
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

✅ **Status:** Already configured! No changes needed.

### Step 2: Verify `backend-server.cjs` Configuration

Check lines 36-39 in `backend-server.cjs`:

```javascript
// ============================================================================
// JWT Configuration for SSO
// ============================================================================
// IMPORTANT: This secret key MUST match exactly with the one in DS (.NET Core)
const JWT_SECRET = process.env.JWT_SECRET || 'YourVerySecureSecretKeyAtLeast32CharactersLong123456';
const JWT_ISSUER = 'DigitalSystem';
const JWT_AUDIENCE = 'IMS';
```

✅ **Status:** Already configured! No changes needed.

### Step 3: Restart Backend Server

After DS team implements their changes, restart your backend:

```powershell
# Stop current backend (if running)
# Press Ctrl+C in the terminal running backend-server.cjs

# Start backend
node backend-server.cjs
```

You should see:
```
✅ SSO Authentication endpoints loaded
Server is running on port 3001
```

### ✅ IMS Team Checklist

- [x] `.env.sqlserver` has `JWT_SECRET` configured
- [x] `backend-server.cjs` has JWT configuration
- [x] SSO validation endpoint implemented (`/api/auth/sso-validate`)
- [x] Frontend `SSOLogin.tsx` component ready
- [ ] Test SSO flow after DS implementation

---

## 🔐 IMPORTANT: Secret Key Synchronization

### Current Secret Key (Both Systems):

```
YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

⚠️ **This is a DEMO key. For production, generate a strong random key!**

### Generate Production Secret Key

#### Method 1: PowerShell (Windows)

```powershell
# Generate 64-character random key
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

#### Method 2: Node.js

```javascript
// generate-secret.js
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('base64');
console.log('New JWT Secret:', secret);
```

Run:
```powershell
node generate-secret.js
```

#### Method 3: Online Generator

Use a password generator with these settings:
- Length: 64 characters
- Include: Letters (uppercase + lowercase) + Numbers + Special characters

### Update Both Systems with New Secret

1. **IMS:** Update `JWT_SECRET` in `.env.sqlserver`
2. **DS:** Update `"Secret"` in `appsettings.json`
3. **Verify:** Both must be **character-for-character identical**

---

## 🧪 Testing After Implementation

### Step 1: Verify Secret Synchronization

Create `test-jwt-sync.cjs` in IMS project:

```javascript
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.sqlserver' });

const JWT_SECRET = process.env.JWT_SECRET;

console.log('Testing JWT Secret Synchronization');
console.log('====================================');
console.log('IMS JWT_SECRET:', JWT_SECRET);
console.log('');

// Simulate DS generating a token
const testToken = jwt.sign(
  { 
    sub: "test-user-id-123", 
    unique_name: "testuser",
    full_name: "Test User"
  },
  JWT_SECRET,
  { 
    issuer: 'DigitalSystem', 
    audience: 'IMS', 
    expiresIn: '24h' 
  }
);

console.log('Generated Token (first 50 chars):', testToken.substring(0, 50) + '...');
console.log('');

// Simulate IMS validating the token
try {
  const decoded = jwt.verify(testToken, JWT_SECRET, {
    issuer: 'DigitalSystem',
    audience: 'IMS'
  });
  
  console.log('✅ SUCCESS! Token validation passed');
  console.log('User ID:', decoded.sub);
  console.log('Username:', decoded.unique_name);
  console.log('Full Name:', decoded.full_name);
  console.log('');
  console.log('🎉 JWT configuration is correct! SSO will work.');
  
} catch (error) {
  console.log('❌ FAILURE! Token validation failed');
  console.log('Error:', error.message);
  console.log('');
  console.log('⚠️ Check that JWT_SECRET matches in both systems!');
}
```

Run:
```powershell
node test-jwt-sync.cjs
```

**Expected Output:**
```
Testing JWT Secret Synchronization
====================================
IMS JWT_SECRET: YourVerySecureSecretKeyAtLeast32CharactersLong123456

Generated Token (first 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...

✅ SUCCESS! Token validation passed
User ID: test-user-id-123
Username: testuser
Full Name: Test User

🎉 JWT configuration is correct! SSO will work.
```

### Step 2: Test Complete SSO Flow

1. **Start IMS Backend:**
   ```powershell
   node backend-server.cjs
   ```

2. **Start IMS Frontend:**
   ```powershell
   npm run dev
   ```

3. **Login to DS System**
   - Go to DS login page
   - Enter credentials
   - Login successfully

4. **Click "IMS Admin" Link**
   - Should redirect to: `http://localhost:5173/sso-login?token=eyJ...`
   - Should show "Authenticating..." spinner
   - Should auto-login and redirect to IMS dashboard

5. **Verify User Session**
   - Check browser console for user data
   - Verify all fields populated (name, office, role, etc.)
   - Test navigation within IMS

---

## 📋 Pre-Deployment Checklist

### DS Team

- [ ] `appsettings.json` has `Jwt` section with correct secret
- [ ] `JwtTokenService.cs` created and registered
- [ ] `SSOController.cs` created with `RedirectToIMS` action
- [ ] "IMS Admin" navigation link added
- [ ] Tested token generation locally
- [ ] Secret key matches IMS exactly

### IMS Team

- [ ] `.env.sqlserver` has `JWT_SECRET` matching DS
- [ ] Backend server restarts successfully
- [ ] SSO validation endpoint working
- [ ] Frontend handles SSO login correctly
- [ ] Initial user sync completed (`node sync-users-from-ds.cjs`)
- [ ] Scheduled user sync configured (daily/weekly)

### Both Teams

- [ ] Same JWT_SECRET in both systems (verified)
- [ ] End-to-end SSO flow tested
- [ ] Production secret key generated (NOT demo key)
- [ ] Secrets stored securely (NOT in Git)
- [ ] Documentation updated with production URLs

---

## 🚀 Production Deployment Steps

### Step 1: Generate Production Secret

```powershell
# Generate strong random secret
-join ((48..57) + (65..90) + (97..122) + 33,35,36,37,38,42,43,45,61 | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Step 2: Update Both Systems

**IMS `.env.sqlserver`:**
```env
JWT_SECRET=<PRODUCTION_SECRET_HERE>
```

**DS `appsettings.json`:**
```json
{
  "Jwt": {
    "Secret": "<PRODUCTION_SECRET_HERE>",
    ...
  }
}
```

### Step 3: Update URLs

**DS `SSOController.cs`:**
```csharp
var imsUrl = "https://ims.yourcompany.com/sso-login"; // Production URL
```

### Step 4: Restart Both Applications

```powershell
# IMS
pm2 restart ims-backend

# DS
# Restart IIS or your .NET hosting service
```

### Step 5: Test in Production

- Login to production DS
- Click "IMS Admin"
- Verify redirect and auto-login
- Check all user data loaded correctly

---

## 📞 Support

If SSO fails, check:

1. **Secret mismatch:** Compare JWT_SECRET in both systems character-by-character
2. **Token expired:** Tokens valid for 24 hours only
3. **User not synced:** Run `node sync-users-from-ds.cjs`
4. **CORS issues:** Check allowed origins in `backend-server.cjs`
5. **Network issues:** Verify both systems can communicate

**Error:** "invalid signature"
- **Cause:** JWT_SECRET mismatch
- **Fix:** Ensure both systems use identical secret

**Error:** "User not found"
- **Cause:** User not in IMS AspNetUsers table
- **Fix:** Run user sync script

**Error:** "Token expired"
- **Cause:** Token older than 24 hours
- **Fix:** Login to DS again to get new token
