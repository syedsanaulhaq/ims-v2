# SSO Integration Guide: Digital System ↔ IMS

## Overview
This document explains how to integrate Single Sign-On (SSO) between your .NET Core Digital System (DS) and Node.js IMS using the shared `AspNetUsers` table.

## Architecture

```
Digital System (.NET Core)          IMS (Node.js + React)
        ↓                                    ↓
    AspNetUsers (SQL Server) ← Shared Database
        ↓                                    ↓
   Generate JWT Token  →  Pass to IMS  →  Validate Token
```

## Prerequisites

1. ✅ Both systems use the same SQL Server database
2. ✅ Both systems have access to the `AspNetUsers` table
3. ✅ Shared secret key for JWT token signing
4. ✅ CORS configured on IMS backend for DS domain

---

## Implementation Steps

### 1. Configure Shared Secret Key

**IMPORTANT:** Use the same secret key in both systems!

#### In .NET Core (DS) - `appsettings.json`:
```json
{
  "JwtSettings": {
    "SecretKey": "YourVeryLongAndSecureSecretKeyHere123!@#MinimumLength32Characters",
    "Issuer": "DigitalSystem",
    "Audience": "IMS",
    "ExpirationHours": 24
  }
}
```

#### In Node.js (IMS) - Create `.env` file:
```env
JWT_SECRET=YourVeryLongAndSecureSecretKeyHere123!@#MinimumLength32Characters
JWT_ISSUER=DigitalSystem
JWT_AUDIENCE=IMS
DS_URL=http://localhost:5000
IMS_URL=http://localhost:8080
```

---

### 2. Install Required Packages

#### Node.js (IMS Backend):
```bash
npm install jsonwebtoken
npm install express-session
npm install cookie-parser
```

#### .NET Core (DS):
```bash
dotnet add package System.IdentityModel.Tokens.Jwt
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

---

### 3. Digital System (.NET Core) Implementation

#### Create JWT Service:

**File: `Services/JwtTokenService.cs`**

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DigitalSystem.Services
{
    public interface IJwtTokenService
    {
        string GenerateToken(ApplicationUser user);
    }

    public class JwtTokenService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;

        public JwtTokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(ApplicationUser user)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"];
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName ?? ""),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? ""),
                new Claim(ClaimTypes.Name, user.UserName ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "User"),
                new Claim("office_id", user.OfficeId?.ToString() ?? ""),
                new Claim("wing_id", user.WingId?.ToString() ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"],
                audience: _configuration["JwtSettings:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(
                    int.Parse(_configuration["JwtSettings:ExpirationHours"] ?? "24")
                ),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
```

#### Create SSO Controller:

**File: `Controllers/SSOController.cs`**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace DigitalSystem.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SSOController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IConfiguration _configuration;

        public SSOController(
            UserManager<ApplicationUser> userManager,
            IJwtTokenService jwtTokenService,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _jwtTokenService = jwtTokenService;
            _configuration = configuration;
        }

        /// <summary>
        /// Redirect to IMS with SSO token
        /// </summary>
        [HttpGet("redirect-to-ims")]
        public async Task<IActionResult> RedirectToIMS()
        {
            // Get current user
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized("User not found");
            }

            // Check if user is active
            if (user.Status != "Active")
            {
                return BadRequest("User account is not active");
            }

            // Generate JWT token
            var token = _jwtTokenService.GenerateToken(user);

            // Get IMS URL from configuration
            var imsUrl = _configuration["IMS_URL"] ?? "http://localhost:8080";

            // Redirect to IMS SSO login endpoint with token
            return Redirect($"{imsUrl}/sso-login?token={token}");
        }

        /// <summary>
        /// Get SSO token (for AJAX requests)
        /// </summary>
        [HttpPost("get-token")]
        public async Task<IActionResult> GetToken()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized("User not found");
            }

            if (user.Status != "Active")
            {
                return BadRequest("User account is not active");
            }

            var token = _jwtTokenService.GenerateToken(user);

            return Ok(new
            {
                token = token,
                imsUrl = _configuration["IMS_URL"] ?? "http://localhost:8080",
                redirectUrl = $"{_configuration["IMS_URL"]}/sso-login?token={token}"
            });
        }
    }
}
```

#### Register JWT Service in Startup.cs or Program.cs:

```csharp
// In ConfigureServices or Program.cs

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// Configure CORS to allow IMS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowIMS", policy =>
    {
        policy.WithOrigins("http://localhost:8080", "http://localhost:3001")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Later in the pipeline
app.UseCors("AllowIMS");
```

#### Add Button in DS UI (Razor/Blazor):

**File: `Views/Shared/_Layout.cshtml` or `Pages/Index.cshtml`**

```html
<!-- In your navigation menu -->
<li class="nav-item">
    <a class="nav-link" href="/api/sso/redirect-to-ims">
        <i class="bi bi-box-seam"></i> Inventory Management
    </a>
</li>

<!-- Or as a button -->
<a href="/api/sso/redirect-to-ims" class="btn btn-primary">
    <i class="bi bi-arrow-right-circle"></i> Go to IMS
</a>
```

---

### 4. IMS Backend (Node.js) Implementation

#### Add SSO endpoints to backend-server.cjs:

```javascript
// At the top of the file
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Add middleware
app.use(cookieParser());
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Configure CORS to allow Digital System
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:8080'],
  credentials: true
}));

// Add the SSO endpoints (copy from sso-auth-implementation.js file created earlier)
```

**Then paste the content from `sso-auth-implementation.js` into your `backend-server.cjs`**

---

### 5. IMS Frontend (React) - Already Created

✅ `SSOLogin.tsx` component created
✅ Route added to `App.tsx`: `/sso-login`

---

## Testing the SSO Flow

### Step-by-Step Test:

1. **Start both servers:**
   ```bash
   # Digital System (.NET Core)
   dotnet run
   
   # IMS Backend (Node.js)
   node backend-server.cjs
   
   # IMS Frontend (React)
   npm run dev
   ```

2. **Login to Digital System:**
   - Go to `http://localhost:5000/login`
   - Login with your credentials

3. **Click "Go to IMS" button:**
   - Should redirect to: `http://localhost:8080/sso-login?token=eyJ...`
   - IMS validates token
   - Redirects to `/dashboard` if valid

4. **Verify session:**
   - Check browser console for: "✅ SSO Authentication successful"
   - User should be logged in to IMS
   - Check `localStorage` for `sso_token`

---

## Security Considerations

### 1. Secret Key Management
- ✅ Use environment variables
- ✅ Minimum 32 characters
- ✅ Never commit to Git
- ✅ Rotate keys periodically

### 2. Token Expiration
- ✅ Set reasonable expiration (1-24 hours)
- ✅ Implement token refresh mechanism
- ✅ Clear expired tokens

### 3. HTTPS
- ⚠️ Use HTTPS in production
- ⚠️ Set `secure: true` for cookies
- ⚠️ Enable HSTS headers

### 4. CORS
- ✅ Only allow specific domains
- ✅ Don't use `*` wildcard in production
- ✅ Validate Origin header

### 5. Database Access
- ✅ Use parameterized queries (already using)
- ✅ Validate user status before creating token
- ✅ Log all SSO attempts

---

## Troubleshooting

### Token Invalid Error
**Problem:** "Invalid or expired token"
**Solution:**
- Verify JWT_SECRET matches in both systems
- Check token expiration time
- Ensure clock sync between servers

### User Not Found
**Problem:** "User not found or inactive"
**Solution:**
- Verify user exists in AspNetUsers
- Check Status = 'Active'
- Verify user ID format (GUID)

### CORS Error
**Problem:** "Access blocked by CORS policy"
**Solution:**
- Add DS domain to CORS whitelist
- Enable credentials in CORS
- Check preflight OPTIONS requests

### Redirect Not Working
**Problem:** Stays on DS, doesn't redirect
**Solution:**
- Check IMS_URL configuration
- Verify SSO endpoint accessible
- Check browser console for errors

---

## Alternative: Cookie-Based SSO

If you prefer cookies over URL tokens:

### .NET Core:
```csharp
Response.Cookies.Append("sso_token", token, new CookieOptions
{
    HttpOnly = true,
    Secure = true, // HTTPS only
    SameSite = SameSiteMode.Lax,
    Expires = DateTimeOffset.UtcNow.AddHours(24)
});
return Redirect($"{imsUrl}/sso-login");
```

### Node.js:
```javascript
app.get('/api/sso-login', async (req, res) => {
  const token = req.cookies.sso_token; // Read from cookie instead of query
  // ... rest of validation
});
```

---

## Database Schema Reference

### AspNetUsers Table (Shared):
```sql
SELECT 
    Id,              -- GUID (used as user_id)
    UserName,        -- Username
    Email,           -- Email address
    Role,            -- User role (Administrator, User, etc.)
    OfficeId,        -- Office ID (int)
    WingId,          -- Wing ID (int)
    Status,          -- Active/Inactive
    CreatedAt,
    UpdatedAt
FROM AspNetUsers
WHERE Status = 'Active'
```

---

## Environment Variables Checklist

### Digital System (.NET Core):
```env
JwtSettings__SecretKey=YourSecretKeyHere
JwtSettings__Issuer=DigitalSystem
JwtSettings__Audience=IMS
JwtSettings__ExpirationHours=24
IMS_URL=http://localhost:8080
```

### IMS (Node.js):
```env
JWT_SECRET=YourSecretKeyHere
JWT_ISSUER=DigitalSystem
JWT_AUDIENCE=IMS
DS_URL=http://localhost:5000
PORT=3001
```

### IMS (React):
```env
VITE_API_URL=http://localhost:3001
VITE_DS_URL=http://localhost:5000
```

---

## Next Steps

1. ✅ Copy the JWT secret key to both systems' configuration
2. ✅ Implement the .NET Core SSOController
3. ✅ Add SSO endpoints to IMS backend (already provided)
4. ✅ Add "Go to IMS" button in DS UI
5. ✅ Test the complete flow
6. ⚠️ Configure HTTPS for production
7. ⚠️ Implement token refresh mechanism
8. ⚠️ Add audit logging for SSO events

---

## Support

If you encounter issues:
1. Check both server logs (DS and IMS)
2. Verify database connection
3. Test JWT token manually at jwt.io
4. Ensure AspNetUsers table has required columns
5. Check CORS headers in browser network tab

---

**Created:** November 3, 2025
**Last Updated:** November 3, 2025
**Version:** 1.0
