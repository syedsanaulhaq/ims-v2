# .NET Core JWT Token Generation Code for DS System

## 📦 Step 1: Install Required NuGet Package

```bash
dotnet add package System.IdentityModel.Tokens.Jwt
```

---

## ⚙️ Step 2: Configure appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=SYED-FAZLI-LAPT;Database=DigitalSystemDB;User Id=inventorymanagementuser;Password=2016Wfp61@;TrustServerCertificate=True;"
  },
  "Jwt": {
    "SecretKey": "YourVerySecureSecretKeyAtLeast32CharactersLong123456",
    "Issuer": "DigitalSystem",
    "Audience": "IMS",
    "ExpirationHours": 24
  },
  "IMS": {
    "BaseUrl": "http://localhost:5173",
    "ProductionUrl": "https://ims.yourdomain.com"
  },
  "IsProduction": false
}
```

**⚠️ IMPORTANT:** The `SecretKey` must be **at least 32 characters** and **MUST MATCH** the `JWT_SECRET` in IMS backend!

---

## 📄 Step 3: Create JwtTokenService.cs

**Location:** `Services/JwtTokenService.cs`

```csharp
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DigitalSystem.Services
{
    /// <summary>
    /// Service for generating JWT tokens for SSO authentication with IMS
    /// </summary>
    public class JwtTokenService
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _expirationHours;

        public JwtTokenService(IConfiguration configuration)
        {
            _secretKey = configuration["Jwt:SecretKey"] 
                ?? throw new ArgumentNullException("Jwt:SecretKey is required in configuration");
            _issuer = configuration["Jwt:Issuer"] ?? "DigitalSystem";
            _audience = configuration["Jwt:Audience"] ?? "IMS";
            _expirationHours = configuration.GetValue<int>("Jwt:ExpirationHours", 24);

            // Validate secret key length (must be at least 32 characters for HS256)
            if (_secretKey.Length < 32)
            {
                throw new ArgumentException("JWT SecretKey must be at least 32 characters long");
            }
        }

        /// <summary>
        /// Generates a JWT token for the specified user with all AspNetUsers fields
        /// </summary>
        /// <param name="user">The ApplicationUser object from AspNetUsers table</param>
        /// <returns>JWT token string</returns>
        public string GenerateToken(ApplicationUser user)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            // Create claims with all user information from AspNetUsers table
            var claims = new List<Claim>
            {
                // Standard JWT claims
                new Claim(JwtRegisteredClaimNames.Sub, user.Id ?? ""), // User ID (Primary Key)
                new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName ?? ""),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Token ID
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()),

                // User identity information
                new Claim("full_name", user.FullName ?? ""),
                new Claim("cnic", user.CNIC ?? ""),
                new Claim("father_or_husband_name", user.FatherOrHusbandName ?? ""),
                
                // Contact information
                new Claim("phone_number", user.PhoneNumber ?? ""),
                
                // Organizational hierarchy
                new Claim("office_id", user.intOfficeID?.ToString() ?? "0"),
                new Claim("wing_id", user.intWingID?.ToString() ?? "0"),
                new Claim("province_id", user.intProvinceID?.ToString() ?? "0"),
                new Claim("division_id", user.intDivisionID?.ToString() ?? "0"),
                new Claim("district_id", user.intDistrictID?.ToString() ?? "0"),
                new Claim("branch_id", user.intBranchID?.ToString() ?? "0"),
                
                // Role and designation
                new Claim("designation_id", user.intDesignationID?.ToString() ?? "0"),
                new Claim("role", user.Role ?? ""),
                new Claim("uid", user.UID?.ToString() ?? "0"),
                
                // Status and profile
                new Claim("is_active", user.ISACT ? "1" : "0"),
                new Claim("gender", user.Gender?.ToString() ?? "0"),
            };

            // Add profile photo if available
            if (!string.IsNullOrEmpty(user.ProfilePhoto))
            {
                claims.Add(new Claim("profile_photo", user.ProfilePhoto));
            }

            // Create symmetric security key from secret
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
            
            // Create signing credentials using HMAC SHA256
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Create JWT token
            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddHours(_expirationHours),
                signingCredentials: credentials
            );

            // Serialize token to string
            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return tokenString;
        }

        /// <summary>
        /// Validates a JWT token (for testing purposes)
        /// </summary>
        /// <param name="token">The JWT token to validate</param>
        /// <returns>Claims principal if valid, null otherwise</returns>
        public ClaimsPrincipal? ValidateToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_secretKey);

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _issuer,
                    ValidateAudience = true,
                    ValidAudience = _audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero // No tolerance for expired tokens
                };

                var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
                return principal;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token validation failed: {ex.Message}");
                return null;
            }
        }
    }
}
```

---

## 🎮 Step 4: Create SSOController.cs

**Location:** `Controllers/SSOController.cs`

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using DigitalSystem.Services;

namespace DigitalSystem.Controllers
{
    /// <summary>
    /// Handles Single Sign-On (SSO) integration with IMS system
    /// </summary>
    [Authorize] // User must be logged into DS
    public class SSOController : Controller
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtTokenService _jwtTokenService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SSOController> _logger;

        public SSOController(
            UserManager<ApplicationUser> userManager,
            JwtTokenService jwtTokenService,
            IConfiguration configuration,
            ILogger<SSOController> logger)
        {
            _userManager = userManager;
            _jwtTokenService = jwtTokenService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Redirects authenticated user to IMS with JWT token
        /// This is the endpoint linked from "IMS-Admin" menu item
        /// </summary>
        /// <returns>Redirect to IMS SSO login page with token</returns>
        [HttpGet]
        [Route("SSO/RedirectToIMS")]
        public async Task<IActionResult> RedirectToIMS()
        {
            try
            {
                // Get currently logged-in user
                var user = await _userManager.GetUserAsync(User);
                
                if (user == null)
                {
                    _logger.LogWarning("SSO attempt without authenticated user");
                    return RedirectToAction("Login", "Account", new { returnUrl = "/SSO/RedirectToIMS" });
                }

                // Check if user is active
                if (!user.ISACT)
                {
                    _logger.LogWarning($"SSO attempt by inactive user: {user.UserName}");
                    TempData["Error"] = "Your account is inactive. Please contact administrator.";
                    return RedirectToAction("Index", "Home");
                }

                // Generate JWT token with all user information
                string token = _jwtTokenService.GenerateToken(user);

                // Get IMS URL from configuration (development or production)
                bool isProduction = _configuration.GetValue<bool>("IsProduction", false);
                string imsUrl = isProduction 
                    ? _configuration["IMS:ProductionUrl"] 
                    : _configuration["IMS:BaseUrl"];

                if (string.IsNullOrEmpty(imsUrl))
                {
                    _logger.LogError("IMS URL not configured in appsettings.json");
                    TempData["Error"] = "IMS system URL is not configured.";
                    return RedirectToAction("Index", "Home");
                }

                // Build redirect URL with token
                string redirectUrl = $"{imsUrl}/sso-login?token={token}";
                
                // Log successful SSO initiation
                _logger.LogInformation($"✅ SSO: User {user.UserName} ({user.FullName}) redirected to IMS");
                
                // Update last logged in timestamp
                user.LastLoggedIn = DateTime.Now;
                await _userManager.UpdateAsync(user);

                // Redirect to IMS
                return Redirect(redirectUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ SSO Error: Failed to generate token or redirect to IMS");
                
                TempData["Error"] = "Failed to connect to IMS system. Please try again later.";
                return RedirectToAction("Index", "Home");
            }
        }

        /// <summary>
        /// Test endpoint to verify JWT token generation (DEVELOPMENT ONLY)
        /// </summary>
        [HttpGet]
        [Route("SSO/TestToken")]
        public async Task<IActionResult> TestToken()
        {
            // Remove this endpoint in production or add [Authorize(Roles = "SuperAdmin")]
            #if DEBUG
            try
            {
                var user = await _userManager.GetUserAsync(User);
                if (user == null)
                    return Unauthorized();

                string token = _jwtTokenService.GenerateToken(user);

                return Ok(new
                {
                    success = true,
                    message = "Token generated successfully",
                    token = token,
                    user = new
                    {
                        id = user.Id,
                        username = user.UserName,
                        fullName = user.FullName,
                        email = user.Email,
                        role = user.Role,
                        officeId = user.intOfficeID,
                        wingId = user.intWingID
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            #else
            return NotFound();
            #endif
        }
    }
}
```

---

## 🔧 Step 5: Register Service in Program.cs

**Location:** `Program.cs` (or `Startup.cs` for older .NET versions)

```csharp
using DigitalSystem.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllersWithViews();

// Configure database context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// ✅ Register JWT Token Service for SSO
builder.Services.AddScoped<JwtTokenService>();

// Configure cookie settings
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Account/Login";
    options.LogoutPath = "/Account/Logout";
    options.AccessDeniedPath = "/Account/AccessDenied";
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
```

---

## 🧩 Step 6: ApplicationUser Model

**Location:** `Models/ApplicationUser.cs`

```csharp
using Microsoft.AspNetCore.Identity;
using System;

namespace DigitalSystem.Models
{
    /// <summary>
    /// Extended user model matching AspNetUsers table structure
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        // Basic Information
        public string? FullName { get; set; }
        public string? FatherOrHusbandName { get; set; }
        public string? CNIC { get; set; }
        public string? Password { get; set; } // Legacy field
        
        // Profile
        public string? ProfilePhoto { get; set; }
        public int? Gender { get; set; } // 0 = Female, 1 = Male
        
        // Organizational Hierarchy
        public int? intOfficeID { get; set; }
        public int? intWingID { get; set; }
        public int? intProvinceID { get; set; }
        public int? intDivisionID { get; set; }
        public int? intDistrictID { get; set; }
        public int? intBranchID { get; set; }
        
        // Role and Designation
        public int? intDesignationID { get; set; }
        public string? Role { get; set; }
        public int? UID { get; set; }
        
        // Status
        public bool ISACT { get; set; } = true;
        public DateTime? LastLoggedIn { get; set; }
        
        // Device Tracking
        public string? IMEI { get; set; }
        public string? IPAddress { get; set; }
        public string? MacAddress { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        
        // Audit Trail
        public string? AddedBy { get; set; }
        public DateTime? AddedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public DateTime? RecordDateTime { get; set; }
    }
}
```

---

## 🎨 Step 7: Add Menu Link

### Option A: In Shared Layout (_Layout.cshtml)

```html
<!-- Add this to your navigation menu -->
<li class="nav-item">
    <a class="nav-link" href="/SSO/RedirectToIMS">
        <i class="fas fa-warehouse"></i>
        <span>IMS-Admin</span>
    </a>
</li>
```

### Option B: As Button

```html
<a href="/SSO/RedirectToIMS" class="btn btn-primary">
    <i class="fas fa-warehouse"></i>
    Launch IMS System
</a>
```

### Option C: In Dashboard

```html
<div class="card">
    <div class="card-body text-center">
        <i class="fas fa-warehouse fa-3x mb-3 text-primary"></i>
        <h5 class="card-title">Inventory Management</h5>
        <p class="card-text">Manage inventory, stock issuance, and approvals</p>
        <a href="/SSO/RedirectToIMS" class="btn btn-primary btn-block">
            Access IMS System
        </a>
    </div>
</div>
```

---

## ✅ Step 8: Testing

### Test in Development:

1. **Start DS application:**
   ```bash
   dotnet run
   ```

2. **Login to DS with your credentials**

3. **Visit test endpoint:**
   ```
   http://localhost:5000/SSO/TestToken
   ```
   
   You should see:
   ```json
   {
     "success": true,
     "message": "Token generated successfully",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "4dae06b7-17cd-480b-81eb-da9c76ad5728",
       "username": "syed.fazal",
       "fullName": "Syed Fazal Hussain",
       ...
     }
   }
   ```

4. **Click "IMS-Admin" link:**
   - Should redirect to IMS
   - Should auto-login successfully
   - Check browser console and backend logs

---

## 🔐 Security Checklist

- ✅ JWT Secret is at least 32 characters
- ✅ JWT Secret matches between DS and IMS
- ✅ JWT Secret stored in appsettings.json (not hardcoded)
- ✅ Token expires after 24 hours
- ✅ [Authorize] attribute on SSOController
- ✅ User active status checked (ISACT = true)
- ✅ Remove TestToken endpoint in production
- ✅ Use HTTPS in production
- ✅ Log all SSO attempts for auditing

---

## 🐛 Troubleshooting

### Issue: "Secret key too short" error

**Solution:** Make sure JWT:SecretKey in appsettings.json is at least 32 characters

### Issue: Token validation fails in IMS

**Solution:** Check that JWT_SECRET in IMS `.env.sqlserver` matches DS `appsettings.json` Jwt:SecretKey exactly

### Issue: User not found in IMS

**Solution:** Run user sync script: `node sync-users-from-ds.cjs`

### Issue: Redirect loop or 401 error

**Solution:** 
- Check user is logged into DS first
- Check user exists in AspNetUsers table
- Check user.ISACT is true

---

## 📝 Summary

You now have complete JWT token generation for SSO! 

**What happens:**
1. User clicks "IMS-Admin" in DS
2. `SSOController.RedirectToIMS()` is called
3. Gets current user from `AspNetUsers`
4. `JwtTokenService.GenerateToken()` creates JWT with all user data
5. Redirects to IMS with token: `http://localhost:5173/sso-login?token=...`
6. IMS validates token and logs user in

**Next steps:**
1. Run initial user sync: `node sync-users-from-ds.cjs`
2. Test the complete flow
3. Schedule daily user sync for production
