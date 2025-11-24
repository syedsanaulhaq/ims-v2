# DS Configuration Fix - SSO Redirect Error

## Problem
DS is redirecting to: `http://172.20.150.34:3001/sso-login?token=...`
This gives error: `Cannot GET /sso-login`

## Root Cause
The DS configuration uses the **backend API URL** (port 3001) for both:
- Authentication API calls ✅ Correct
- SSO redirect ❌ Wrong - should use frontend URL (port 80)

---

## Solution: Update DS appsettings.json

### Current Configuration (WRONG):
```json
{
  "IMSUrl": "http://172.20.150.34:3001"
}
```

### Fixed Configuration:
```json
{
  "IMSApiUrl": "http://172.20.150.34:3001",
  "IMSUrl": "http://172.20.150.34"
}
```

---

## Update DS IMSController.cs

### Current Code (WRONG):
```csharp
string imsUrl = _configuration["IMSUrl"];

// Uses same URL for API and redirect
var apiHelper = new API_HelperIMS(imsUrl);
var token = await apiHelper.AuthenticateAsync(username, password);

if (!string.IsNullOrEmpty(token))
{
    return Redirect($"{imsUrl}/sso-login?token={token}");
}
```

### Fixed Code:
```csharp
// Separate URLs for API and frontend
string imsApiUrl = _configuration["IMSApiUrl"];  // Backend: 3001
string imsUrl = _configuration["IMSUrl"];        // Frontend: 80

// Use API URL for authentication
var apiHelper = new API_HelperIMS(imsApiUrl);
var token = await apiHelper.AuthenticateAsync(username, password);

if (!string.IsNullOrEmpty(token))
{
    // Use frontend URL for redirect
    return Redirect($"{imsUrl}/sso-login?token={token}");
}
```

---

## Complete Updated IMSController.cs

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace YourNamespace.Controllers
{
    public class IMSController : Controller
    {
        private readonly IConfiguration _configuration;

        public IMSController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> GoToIMS()
        {
            try
            {
                // Get username from session (adjust based on your session structure)
                var username = HttpContext.Session.GetString("UserName") 
                            ?? HttpContext.Session.GetString("CNIC");
                
                if (string.IsNullOrEmpty(username))
                {
                    return RedirectToAction("Login", "Account");
                }

                // Separate URLs for API calls vs frontend redirect
                string imsApiUrl = _configuration["IMSApiUrl"];   // http://172.20.150.34:3001
                string imsUrl = _configuration["IMSUrl"];          // http://172.20.150.34
                
                // Hard-coded password for now (you can change this later)
                string password = "P@ssword@1";
                
                // Call IMS authentication API using backend URL
                var apiHelper = new API_HelperIMS(imsApiUrl);
                var token = await apiHelper.AuthenticateAsync(username, password);
                
                if (!string.IsNullOrEmpty(token))
                {
                    // Redirect to IMS frontend with token
                    return Redirect($"{imsUrl}/sso-login?token={token}");
                }
                else
                {
                    TempData["Error"] = "IMS authentication failed. Please contact administrator.";
                    return RedirectToAction("Index", "Home");
                }
            }
            catch (System.Exception ex)
            {
                TempData["Error"] = $"Error connecting to IMS: {ex.Message}";
                return RedirectToAction("Index", "Home");
            }
        }
    }
}
```

---

## Update DS appsettings.json

**Location:** Your DS project root folder

Add both URLs:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "..."
  },
  "IMSApiUrl": "http://172.20.150.34:3001",
  "IMSUrl": "http://172.20.150.34",
  "Logging": {
    ...
  }
}
```

---

## Testing After Fix

1. **Update DS configuration:**
   - Add `IMSApiUrl` and `IMSUrl` to appsettings.json
   - Update IMSController.cs to use both URLs

2. **Rebuild DS application:**
   ```powershell
   dotnet build
   ```

3. **Test the flow:**
   - Login to DS
   - Click "IMS Admin"
   - Should redirect to: `http://172.20.150.34/sso-login?token=...`
   - Should auto-login to IMS (no loading screen)

---

## Quick Fix (If You Can't Change Code)

**Alternative:** Update only appsettings.json to use frontend URL:

```json
{
  "IMSUrl": "http://172.20.150.34"
}
```

Then your API_HelperIMS needs to append `/api/auth/ds-authenticate`:

```csharp
// In API_HelperIMS.cs
public async Task<string> AuthenticateAsync(string username, string password)
{
    var apiUrl = $"{_baseUrl}/api/auth/ds-authenticate";  // Append API path
    // ... rest of code
}
```

This way:
- API calls go to: `http://172.20.150.34/api/auth/ds-authenticate` (proxied by IIS)
- Redirects go to: `http://172.20.150.34/sso-login?token=...` (frontend)

---

## Summary

**The fix:** Use port 80 (frontend) for SSO redirect, not port 3001 (backend).

**Two options:**
1. **Best:** Separate `IMSApiUrl` (3001) and `IMSUrl` (80) in config
2. **Alternative:** Use port 80 for both, configure IIS to proxy API requests to backend
