# Digital System (DS) SSO Implementation Guide

## Quick Start - What You Need to Do in DS (.NET Core)

Your IMS system is now ready to receive SSO logins. Follow these steps to implement SSO in your Digital System:

---

## Step 1: Install JWT Package in DS

```bash
dotnet add package System.IdentityModel.Tokens.Jwt
```

---

## Step 2: Configure JWT Settings

### Add to `appsettings.json`:

```json
{
  "Jwt": {
    "SecretKey": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS"
  },
  "IMS": {
    "BaseUrl": "http://localhost:5173",
    "ProductionUrl": "https://ims.yourdomain.com"
  }
}
```

**⚠️ CRITICAL:** The `SecretKey` must be **at least 32 characters** and must match exactly in IMS backend.

---

## Step 3: Create JWT Token Service in DS

### File: `Services/JwtTokenService.cs`

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;

namespace DigitalSystem.Services
{
    public class JwtTokenService
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;

        public JwtTokenService(IConfiguration configuration)
        {
            _secretKey = configuration["Jwt:SecretKey"];
            _issuer = configuration["Jwt:Issuer"];
            _audience = configuration["Jwt:Audience"];
        }

        public string GenerateToken(ApplicationUser user)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName),
                new Claim("full_name", user.FullName ?? ""),
                new Claim("cnic", user.CNIC ?? ""),
                new Claim("phone_number", user.PhoneNumber ?? ""),
                new Claim("role", user.Role ?? ""),
                new Claim("office_id", user.intOfficeID?.ToString() ?? "0"),
                new Claim("wing_id", user.intWingID?.ToString() ?? "0"),
                new Claim("branch_id", user.intBranchID?.ToString() ?? "0"),
                new Claim("designation_id", user.intDesignationID?.ToString() ?? "0"),
                new Claim("province_id", user.intProvinceID?.ToString() ?? "0"),
                new Claim("division_id", user.intDivisionID?.ToString() ?? "0"),
                new Claim("district_id", user.intDistrictID?.ToString() ?? "0"),
                new Claim("uid", user.UID?.ToString() ?? "0"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, 
                         DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24), // Token valid for 24 hours
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
```

---

## Step 4: Create SSO Controller in DS

### File: `Controllers/SSOController.cs`

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using DigitalSystem.Services;
using DigitalSystem.Models; // Your ApplicationUser model
using System.Threading.Tasks;

namespace DigitalSystem.Controllers
{
    [Authorize] // User must be logged in to DS
    public class SSOController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtTokenService _jwtTokenService;
        private readonly IConfiguration _configuration;

        public SSOController(
            UserManager<ApplicationUser> userManager,
            JwtTokenService jwtTokenService,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _jwtTokenService = jwtTokenService;
            _configuration = configuration;
        }

        /// <summary>
        /// Redirect to IMS with JWT token
        /// This endpoint is called when user clicks "IMS-Admin" link in DS
        /// </summary>
        [HttpGet]
        [Route("SSO/RedirectToIMS")]
        public async Task<IActionResult> RedirectToIMS()
        {
            try
            {
                // Get current logged-in user
                var user = await _userManager.GetUserAsync(User);
                if (user == null)
                {
                    return RedirectToAction("Login", "Account");
                }

                // Generate JWT token with all user information
                string token = _jwtTokenService.GenerateToken(user);

                // Get IMS URL from configuration
                bool isProduction = _configuration.GetValue<bool>("IsProduction");
                string imsUrl = isProduction 
                    ? _configuration["IMS:ProductionUrl"] 
                    : _configuration["IMS:BaseUrl"];

                // Redirect to IMS with token
                string redirectUrl = $"{imsUrl}/sso-login?token={token}";
                
                // Log for debugging (remove in production)
                Console.WriteLine($"✅ SSO: Redirecting {user.UserName} to IMS");
                
                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                // Log error
                Console.WriteLine($"❌ SSO Error: {ex.Message}");
                return BadRequest(new { 
                    error = "Failed to generate SSO token", 
                    details = ex.Message 
                });
            }
        }
    }
}
```

---

## Step 5: Register JWT Service

### In `Program.cs` or `Startup.cs`:

```csharp
// Add to ConfigureServices or builder.Services
builder.Services.AddScoped<JwtTokenService>();
```

---

## Step 6: Add Menu Link in DS

### Option A: Razor View (.cshtml)

```html
<li class="nav-item">
    <a href="/SSO/RedirectToIMS" class="nav-link">
        <i class="fas fa-warehouse"></i>
        <span>IMS-Admin</span>
    </a>
</li>
```

### Option B: Direct HTML

```html
<a href="/SSO/RedirectToIMS" class="btn btn-primary">
    <i class="fas fa-warehouse"></i>
    IMS-Admin
</a>
```

### Option C: React Component (if DS uses React)

```jsx
<Link to="/SSO/RedirectToIMS" className="nav-link">
    <FaWarehouse /> IMS-Admin
</Link>
```

---

## Step 7: Update IMS Backend JWT Secret

### In IMS `backend-server.cjs`:

Find this line (around line 33):
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'YourVerySecureSecretKeyAtLeast32CharactersLong123456';
```

**Make sure this matches EXACTLY with DS appsettings.json Jwt:SecretKey**

### Add to `.env.sqlserver` file:

```env
JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

---

## Testing the SSO Flow

### Test Checklist:

1. ✅ **Start IMS Backend:**
   ```bash
   node backend-server.cjs
   ```
   Expected output:
   ```
   ✅ SSO Authentication endpoints loaded
   ✅ Server running on http://localhost:3001
   ```

2. ✅ **Start IMS Frontend:**
   ```bash
   npm run dev
   ```
   Expected output:
   ```
   Local: http://localhost:5173/
   ```

3. ✅ **Start DS System** (your .NET Core app)

4. ✅ **Test Flow:**
   - Login to DS with AspNetUsers credentials
   - Click "IMS-Admin" link
   - Should redirect to IMS automatically
   - Check browser console for logs

### Expected Console Logs:

**DS (Backend):**
```
✅ SSO: Redirecting john.doe to IMS
```

**IMS Frontend (Browser Console):**
```
🔐 Validating SSO token from Digital System...
✅ SSO validation successful: john.doe
```

**IMS Backend:**
```
🔐 Validating SSO token from Digital System...
🔍 Token decoded successfully for user: john.doe (4dae06b7-...)
✅ SSO login successful for user: john.doe (Office: Main Office)
```

---

## Troubleshooting Guide

### Issue 1: "Invalid token" error

**Cause:** JWT secret key mismatch

**Solution:**
1. Check DS `appsettings.json` → `Jwt:SecretKey`
2. Check IMS `backend-server.cjs` → `JWT_SECRET`
3. Ensure they match **exactly** (case-sensitive)

---

### Issue 2: "User not found" error

**Cause:** User doesn't exist in AspNetUsers table

**Solution:**
1. Verify user exists:
   ```sql
   SELECT Id, UserName, Email FROM AspNetUsers WHERE UserName = 'john.doe'
   ```
2. Check user ID is a valid GUID
3. Ensure AspNetUsers table is synced between DS and IMS

---

### Issue 3: "Token expired" error

**Cause:** Token is valid for 24 hours

**Solution:**
1. User needs to logout and login to DS again
2. DS will generate new token
3. Consider increasing expiration time in `JwtTokenService.cs`:
   ```csharp
   expires: DateTime.UtcNow.AddHours(48), // 48 hours instead of 24
   ```

---

### Issue 4: CORS errors in browser

**Cause:** IMS backend not allowing DS domain

**Solution:**
Add DS domain to CORS in `backend-server.cjs`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000', // Add your DS URL
    'https://ds.yourdomain.com' // Add production DS URL
  ],
  credentials: true
}));
```

---

### Issue 5: Redirect not working

**Cause:** Incorrect IMS URL in appsettings.json

**Solution:**
Verify IMS URL in DS `appsettings.json`:
```json
{
  "IMS": {
    "BaseUrl": "http://localhost:5173", // For development
    "ProductionUrl": "https://ims.yourdomain.com" // For production
  }
}
```

---

## Production Deployment Checklist

### 1. Generate Strong Secret Key

```csharp
// Use this C# code to generate a secure random key
using System;
using System.Security.Cryptography;

var key = new byte[32];
RandomNumberGenerator.Fill(key);
var secretKey = Convert.ToBase64String(key);
Console.WriteLine(secretKey); // Copy this to appsettings.json
```

### 2. Update Production Configuration

**DS `appsettings.Production.json`:**
```json
{
  "Jwt": {
    "SecretKey": "[YOUR_GENERATED_KEY_FROM_STEP_1]"
  },
  "IMS": {
    "ProductionUrl": "https://ims.yourdomain.com"
  }
}
```

**IMS `.env.production`:**
```env
JWT_SECRET=[YOUR_GENERATED_KEY_FROM_STEP_1]
```

### 3. Enable HTTPS

- DS: Already has HTTPS
- IMS: Configure HTTPS in production server (Nginx/IIS)

### 4. Update CORS for Production

```javascript
app.use(cors({
  origin: [
    'https://ds.yourdomain.com', // Production DS
    'https://ims.yourdomain.com' // Production IMS
  ],
  credentials: true
}));
```

### 5. Security Headers

Add to IMS backend:
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

---

## FAQ

### Q: Do users need to login twice?
**A:** No! Users login once to DS, then click "IMS-Admin" link to access IMS automatically.

### Q: What if the token expires?
**A:** Tokens are valid for 24 hours. After expiration, user needs to login to DS again.

### Q: Can we increase token validity?
**A:** Yes, change `expires: DateTime.UtcNow.AddHours(24)` to desired hours in `JwtTokenService.cs`.

### Q: Is the token secure?
**A:** Yes, it uses industry-standard JWT with HMAC-SHA256 signing.

### Q: Can we add more user information?
**A:** Yes, add more claims in `JwtTokenService.cs`:
```csharp
new Claim("role", user.Role),
new Claim("department", user.Department)
```

### Q: What if user data changes in AspNetUsers?
**A:** Token contains snapshot at generation time. For fresh data, user needs to re-login to DS.

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check IMS backend logs
3. Verify JWT secret key matches in both systems
4. Test with a known user from AspNetUsers table
5. Ensure both systems are running

---

## Summary

✅ **IMS is ready** - SSO endpoint `/api/auth/sso-validate` is live  
✅ **SSOLogin.tsx** - Frontend component created and configured  
✅ **Route added** - `/sso-login` path is active  

**Your task:** Implement Steps 1-6 in DS (.NET Core) and test!

Once DS sends JWT token to `http://localhost:5173/sso-login?token=...`, users will be automatically logged into IMS!
