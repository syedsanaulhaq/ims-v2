# Digital System (DS) to IMS - SSO Integration Guide

## Overview
Enable seamless Single Sign-On from .NET Core Digital System to Node.js IMS without requiring separate login.

## Architecture
```
User in DS → Clicks "IMS-Admin" → DS generates JWT token → Redirects to IMS with token → IMS validates token → User logged in
```

---

## Part 1: .NET Core (Digital System) Implementation

### 1.1 Install JWT Package
```bash
dotnet add package System.IdentityModel.Tokens.Jwt
```

### 1.2 Create JWT Token Service (C#)

**File: `Services/JwtTokenService.cs`**

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace DigitalSystem.Services
{
    public class JwtTokenService
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;

        public JwtTokenService(IConfiguration configuration)
        {
            // IMPORTANT: Use same secret key in both DS and IMS
            _secretKey = configuration["Jwt:SecretKey"]; // Must be 32+ characters
            _issuer = configuration["Jwt:Issuer"];       // e.g., "DigitalSystem"
            _audience = configuration["Jwt:Audience"];   // e.g., "IMS"
        }

        public string GenerateToken(string userId, string userName, string email, string officeName = null, string wingName = null)
        {
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(JwtRegisteredClaimNames.UniqueName, userName),
                new Claim("office_name", officeName ?? ""),
                new Claim("wing_name", wingName ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString())
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

### 1.3 Create SSO Controller (C#)

**File: `Controllers/SSOController.cs`**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using DigitalSystem.Services;
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

                // Generate JWT token
                string token = _jwtTokenService.GenerateToken(
                    userId: user.Id.ToString(),
                    userName: user.UserName,
                    email: user.Email,
                    officeName: user.OfficeName, // If you have these fields
                    wingName: user.WingName
                );

                // Get IMS URL from configuration
                string imsUrl = _configuration["IMS:BaseUrl"]; // e.g., "http://localhost:5173"

                // Redirect to IMS with token
                string redirectUrl = $"{imsUrl}/sso-login?token={token}";
                
                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                // Log error
                return BadRequest(new { error = "Failed to generate SSO token", details = ex.Message });
            }
        }
    }
}
```

### 1.4 Configure appsettings.json (DS)

**File: `appsettings.json`**

```json
{
  "Jwt": {
    "SecretKey": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS"
  },
  "IMS": {
    "BaseUrl": "http://localhost:5173"
  }
}
```

### 1.5 Register JWT Service in Program.cs/Startup.cs

```csharp
// Add to ConfigureServices or builder.Services
builder.Services.AddScoped<JwtTokenService>();
```

### 1.6 Add Menu Link in DS

In your DS navigation menu, add:

```html
<a href="/SSO/RedirectToIMS" class="nav-link">
    <i class="fas fa-warehouse"></i>
    IMS-Admin
</a>
```

---

## Part 2: Node.js (IMS Backend) Implementation

### 2.1 Install JWT Package

```bash
npm install jsonwebtoken
```

### 2.2 Add JWT Secret to Backend

**File: `backend-server.cjs`** (Add at top with other configs)

```javascript
// JWT Configuration - Must match DS configuration
const JWT_SECRET = 'YourVerySecureSecretKeyAtLeast32CharactersLong123456'; // SAME as DS
const JWT_ISSUER = 'DigitalSystem';
const JWT_AUDIENCE = 'IMS';

const jwt = require('jsonwebtoken');
```

### 2.3 Add SSO Login Endpoint

**File: `backend-server.cjs`** (Add before `startServer()`)

```javascript
// ============================================================================
// SSO Authentication Endpoints
// ============================================================================

// Validate SSO token from Digital System
app.post('/api/auth/sso-validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    // Extract user information from token
    const userId = decoded.sub;
    const userName = decoded.unique_name;
    const email = decoded.email;

    // Verify user exists in AspNetUsers table
    const userResult = await pool.request()
      .input('user_id', sql.NVarChar, userId)
      .query(`
        SELECT 
          Id,
          UserName,
          Email,
          OfficeName,
          WingName,
          intOfficeID,
          intWingID
        FROM AspNetUsers
        WHERE Id = @user_id
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    const user = userResult.recordset[0];

    // Return user session data
    res.json({
      success: true,
      user: {
        id: user.Id,
        username: user.UserName,
        email: user.Email,
        office_name: user.OfficeName,
        wing_name: user.WingName,
        office_id: user.intOfficeID,
        wing_id: user.intWingID
      },
      token: token // Return token for subsequent requests
    });

    console.log('✅ SSO login successful for user:', userName);

  } catch (error) {
    console.error('❌ SSO validation error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'SSO validation failed', details: error.message });
  }
});

console.log('✅ SSO Authentication endpoints loaded');
```

---

## Part 3: React (IMS Frontend) Implementation

### 3.1 Create SSO Login Component

**File: `src/pages/SSOLogin.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function SSOLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth(); // Your auth context login function
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    validateSSOToken();
  }, []);

  const validateSSOToken = async () => {
    try {
      const token = searchParams.get('token');

      if (!token) {
        setError('No authentication token provided');
        setIsValidating(false);
        return;
      }

      console.log('🔐 Validating SSO token...');

      // Call backend to validate token
      const response = await fetch('http://localhost:3001/api/auth/sso-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token validation failed');
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ SSO validation successful:', data.user.username);

        // Store user session (adjust based on your auth context implementation)
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Call your auth context login function
        await login(data.user, data.token);

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('Invalid token response');
      }

    } catch (err: any) {
      console.error('❌ SSO validation error:', err);
      setError(err.message || 'Failed to authenticate via SSO');
      setIsValidating(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Authenticating from Digital System...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Authentication Failed</strong>
              <p className="mt-2">{error}</p>
            </AlertDescription>
          </Alert>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

### 3.2 Add SSO Route

**File: `src/App.tsx`**

Add import:
```typescript
import SSOLogin from "./pages/SSOLogin";
```

Add route (in public routes section):
```typescript
<Route path="/sso-login" element={<SSOLogin />} />
```

---

## Configuration Summary

### ⚙️ Environment Variables

**DS (.NET Core) - appsettings.json:**
```json
{
  "Jwt": {
    "SecretKey": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS"
  },
  "IMS": {
    "BaseUrl": "http://localhost:5173"
  }
}
```

**IMS (Node.js) - backend-server.cjs:**
```javascript
const JWT_SECRET = 'YourVerySecureSecretKeyAtLeast32CharactersLong123456'; // MUST MATCH DS
const JWT_ISSUER = 'DigitalSystem';
const JWT_AUDIENCE = 'IMS';
```

**⚠️ CRITICAL: Both systems MUST use the SAME secret key!**

---

## Testing the SSO Flow

### Test Steps:

1. **Start IMS backend:**
   ```bash
   node backend-server.cjs
   ```

2. **Start IMS frontend:**
   ```bash
   npm run dev
   ```

3. **Start DS system** (your .NET Core app)

4. **Login to DS** with your AspNetUsers credentials

5. **Click "IMS-Admin" link** in DS navigation

6. **Expected Flow:**
   - DS generates JWT token
   - Redirects to: `http://localhost:5173/sso-login?token=eyJhbGc...`
   - IMS validates token
   - User automatically logged into IMS
   - Redirected to IMS dashboard

### Verification Checklist:

✅ JWT secret key matches in both systems  
✅ Token contains user ID from AspNetUsers  
✅ IMS validates token successfully  
✅ User session created in IMS  
✅ User redirected to dashboard  

---

## Security Considerations

1. **HTTPS in Production:** Use HTTPS for both DS and IMS in production
2. **Token Expiration:** Tokens expire after 24 hours (configurable)
3. **Secret Key:** Use strong random string (32+ characters)
4. **Token Transmission:** Token passed via URL parameter (consider POST for production)
5. **CORS Configuration:** Ensure IMS backend allows requests from DS domain

---

## Production Deployment

### Update URLs for Production:

**DS appsettings.Production.json:**
```json
{
  "IMS": {
    "BaseUrl": "https://ims.yourdomain.com"
  }
}
```

**IMS Frontend - Update API base URL in fetch calls:**
```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'https://api.ims.yourdomain.com';
```

---

## Troubleshooting

### Common Issues:

**1. "Invalid token" error:**
- ✅ Check JWT_SECRET matches exactly in both systems
- ✅ Verify token is being passed correctly in URL

**2. "User not found" error:**
- ✅ Confirm user exists in AspNetUsers table
- ✅ Check user ID format (GUID)

**3. "Token expired" error:**
- ✅ Token is valid for 24 hours
- ✅ User needs to login to DS again

**4. CORS errors:**
- ✅ Add DS domain to IMS backend CORS configuration
- ✅ Check browser console for specific CORS error

---

## Next Steps

1. ✅ Implement DS JWT token generation
2. ✅ Add SSO endpoint to IMS backend
3. ✅ Create SSOLogin component in IMS frontend
4. ✅ Add route for `/sso-login`
5. ✅ Test complete flow
6. ✅ Update production configurations
7. ✅ Deploy to production

---

## Benefits of This Approach

✅ **No Duplicate Login:** User logs in once to DS, accesses IMS seamlessly  
✅ **Shared User Database:** Both systems use same AspNetUsers table  
✅ **Secure:** JWT tokens with expiration and signature verification  
✅ **Scalable:** Can extend to multiple systems  
✅ **Standard:** Uses industry-standard JWT authentication  

