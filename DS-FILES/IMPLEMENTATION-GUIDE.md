# DS Integration - Final Implementation Guide

## Files Ready for DS System

All files are in the `DS-FILES` folder, ready to copy to your DS project.

---

## What Changed

### ✅ `appsettings.json` - Already Correct!
Your current config already has:
```json
"IMSUrl": "http://172.20.150.34:3001"
```
**No changes needed!**

---

### ✅ `API_HelperIMS.cs` - Already Correct!
Your new helper file already has the `AuthenticateAsync` method.
**No changes needed!**

---

### ❌ `IMSController.cs` - NEEDS UPDATE

**Problem:** Your current controller calls `apiHelper.PostAsync()` which doesn't exist in the new helper.

**What I Changed:**

1. **Removed old code:**
   ```csharp
   // OLD - DELETE THIS:
   var loginRequest = new { CNIC = cnic, Password = password };
   string data = Newtonsoft.Json.JsonConvert.SerializeObject(loginRequest);
   var (response, statusCode) = await apiHelper.PostAsync("/api/auth/ds-authenticate", string.Empty, data);
   ```

2. **Added new code:**
   ```csharp
   // NEW - USE THIS:
   var result = await apiHelper.AuthenticateAsync(username, password);
   ```

3. **Updated response handling:**
   ```csharp
   // OLD:
   if (statusCode == 200) {
       var tokenResponse = response.ToObject<TokenResponse>();
   
   // NEW:
   if (result["success"]?.Value<bool>() == true) {
       var token = result["Token"]?.ToString();
   ```

4. **Added error handling:**
   ```csharp
   try {
       // API call
   } catch (Exception ex) {
       return StatusCode(500, $"Error connecting to IMS: {ex.Message}");
   }
   ```

---

## Installation Steps

### Step 1: Replace IMSController.cs

**Location:** `ECPPMU.Web/Areas/InventoryMIS/Controllers/IMSController.cs`

**Action:** Replace with the file from `DS-FILES/IMSController.cs`

---

### Step 2: Verify API_HelperIMS.cs

**Location:** `DigitalSystem/Helpers/API_HelperIMS.cs`

**Action:** Make sure it has the `AuthenticateAsync` method (you already have this!)

---

### Step 3: Test the Integration

1. **Build the DS project**
2. **Run the DS application**
3. **Login with credentials:**
   - Username: `1234567891011`
   - Password: `admin123`
4. **Click "IMS Admin" menu**
5. **Expected:** Redirects to IMS and auto-logs in

---

## How It Works

### Flow:

1. User logs into DS → Session stores `CNIC` (which is the username)
2. User clicks "IMS Admin" menu
3. DS calls `GoToIMS()` method
4. Controller gets username from session: `HttpContext.Session.GetString("CNIC")`
5. Calls IMS API: `apiHelper.AuthenticateAsync(username, password)`
6. IMS validates and returns JWT token
7. DS redirects: `http://172.20.150.34/sso-login?token={JWT}`
8. IMS frontend validates token and logs user in
9. User lands on IMS dashboard

---

## Important Notes

### Session Data
The code uses `GetString("CNIC")` to get the username. This assumes your DS login stores the username in the "CNIC" session key:

```csharp
// During DS login:
HttpContext.Session.SetString("CNIC", user.UserName); // e.g., "1234567891011"
HttpContext.Session.SetString("Pwd", password);
```

If your session uses different keys, update line 63 in IMSController.cs:
```csharp
string username = HttpContext.Session.GetString("YourSessionKey");
```

---

## Testing with Real Users

After testing with `1234567891011`, test with actual DS users:

1. Make sure user exists in both DS and IMS `AspNetUsers` tables
2. UserNames must match
3. Password hashes must be compatible (bcrypt)
4. User must be active (`ISACT = 1`)

---

## Troubleshooting

### Error: "Session expired"
- User not logged into DS
- Session timeout
- **Fix:** Login to DS again

### Error: "Connection error"
- IMS backend not running
- Wrong IMSUrl in appsettings.json
- **Fix:** Check backend is running on port 3001

### Error: "Invalid username or password"
- Username doesn't exist in IMS database
- Password doesn't match
- User is inactive (`ISACT = 0`)
- **Fix:** Run `node create-test-user.cjs` to reset test user password

### Error: "IMS server returned non-JSON response"
- Backend crashed or returned HTML error
- **Fix:** Check backend console for errors, restart if needed

---

## Summary

**Replace:** `IMSController.cs` with the new version
**Keep:** `API_HelperIMS.cs` (already correct)
**Keep:** `appsettings.json` (already correct)
**Test:** Login and click "IMS Admin"

That's it! The integration should work perfectly. 🎉
