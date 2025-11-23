# DS Controller Changes Required

## Summary of Changes

The current DS `IMSController` needs 5 key changes to work with the new IMS authentication API.

---

## Changes Needed:

### 1. **Get UserName instead of CNIC from session**

**Current Code:**
```csharp
string cnic = HttpContext.Session.GetString("CNIC");
```

**New Code:**
```csharp
string username = HttpContext.Session.GetString("UserName");
```

**Why:** The IMS API now authenticates by UserName field, not CNIC.

---

### 2. **Use new API_HelperIMS with AuthenticateAsync method**

**Current Code:**
```csharp
var apiHelper = new API_HelperIMS(imsUrl);
var loginRequest = new { CNIC = cnic, Password = password };
string data = Newtonsoft.Json.JsonConvert.SerializeObject(loginRequest);
var (response, statusCode) = await apiHelper.PostAsync("/api/auth/ds-authenticate", string.Empty, data);
```

**New Code:**
```csharp
var apiHelper = new API_HelperIMS(imsUrl);
var result = await apiHelper.AuthenticateAsync(username, password);
```

**Why:** The new helper handles JSON serialization and error handling internally.

---

### 3. **Check success field in response**

**Current Code:**
```csharp
if (statusCode == 200)
{
    var tokenResponse = response.ToObject<TokenResponse>();
    if (!string.IsNullOrEmpty(tokenResponse?.Token))
```

**New Code:**
```csharp
if (result["success"]?.Value<bool>() == true)
{
    var token = result["Token"]?.ToString();
    if (!string.IsNullOrEmpty(token))
```

**Why:** The API returns a JObject with success/Token fields.

---

### 4. **Better error handling**

**Current Code:**
```csharp
return Unauthorized("Authentication failed.");
```

**New Code:**
```csharp
var errorMessage = result["message"]?.ToString() ?? "Authentication failed";
return Unauthorized(errorMessage);
```

**Why:** Shows actual error message from IMS (e.g., "Invalid username or password").

---

### 5. **Add try-catch block**

**New Code:**
```csharp
try
{
    // API call
}
catch (Exception ex)
{
    return StatusCode(500, $"Error connecting to IMS: {ex.Message}");
}
```

**Why:** Handles network errors gracefully.

---

## Configuration Required

**appsettings.json:**
```json
{
  "IMSUrl": "http://172.20.150.34:3001"
}
```

**Note:** No trailing slash!

---

## Session Data Required

Make sure your DS login sets `UserName` in session:

```csharp
// During DS login:
HttpContext.Session.SetString("UserName", user.UserName); // e.g., "1234567891011"
HttpContext.Session.SetString("Pwd", password);
```

---

## Files to Replace

1. **Replace:** `DigitalSystem/Helpers/API_HelperIMS.cs`
   **With:** Content from `API_HelperIMS-FIXED.cs`

2. **Update:** `Areas/InventoryMIS/Controllers/IMSController.cs`
   **Use:** Changes shown in `IMSController-UPDATED.cs`

---

## Testing

After making changes:

1. **Restart DS application**
2. **Login to DS** with username: `1234567891011` / password: `admin123`
3. **Click "IMS Admin"** menu
4. **Expected:** Redirects to `http://172.20.150.34/sso-login?token=...`
5. **Expected:** Auto-logs into IMS dashboard

---

## Complete Updated Method

```csharp
[ServiceFilter(typeof(SessionExpireFilterAttribute))]
public async Task<IActionResult> GoToIMS()
{
    string username = HttpContext.Session.GetString("UserName");
    string password = HttpContext.Session.GetString("Pwd");
    string imsUrl = _configuration["IMSUrl"];

    if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
    {
        return BadRequest("Session expired. Please login again.");
    }

    try
    {
        var apiHelper = new API_HelperIMS(imsUrl);
        var result = await apiHelper.AuthenticateAsync(username, password);

        if (result["success"]?.Value<bool>() == true)
        {
            var token = result["Token"]?.ToString();
            
            if (!string.IsNullOrEmpty(token))
            {
                return Redirect($"{imsUrl}/sso-login?token={token}");
            }
        }

        var errorMessage = result["message"]?.ToString() ?? "Authentication failed";
        return Unauthorized(errorMessage);
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"Error connecting to IMS: {ex.Message}");
    }
}
```
