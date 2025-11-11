/**
 * Sync AspNetUsers from Digital System (DS) to IMS Database
 * 
 * Run this script periodically to keep IMS users in sync with DS:
 * - Daily/Weekly via Task Scheduler
 * - After adding new users to DS
 * - Before important operations
 * 
 * Usage: node sync-users-from-ds.cjs
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

// DS Database Configuration (Source)
const dsConfig = {
  server: process.env.DS_SQL_SERVER_HOST || process.env.SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
  database: process.env.DS_SQL_SERVER_DATABASE || 'DigitalSystemDB',
  user: process.env.DS_SQL_SERVER_USER || process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.DS_SQL_SERVER_PASSWORD || process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.DS_SQL_SERVER_PORT || process.env.SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// IMS Database Configuration (Target)
const imsConfig = {
  server: process.env.SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function syncUsers() {
  let dsPool, imsPool;
  
  try {
    console.log('🔄 Starting user sync from DS to IMS...\n');
    
    // Connect to DS database
    console.log(`🔗 Connecting to DS database: ${dsConfig.database}`);
    dsPool = await sql.connect(dsConfig);
    console.log('✅ Connected to DS database\n');
    
    // Get all users from DS
    console.log('📥 Fetching users from DS database...');
    const dsUsers = await dsPool.request().query(`
      SELECT 
        Id,
        FullName,
        FatherOrHusbandName,
        CNIC,
        UserName,
        NormalizedUserName,
        Email,
        NormalizedEmail,
        EmailConfirmed,
        PasswordHash,
        SecurityStamp,
        ConcurrencyStamp,
        PhoneNumber,
        PhoneNumberConfirmed,
        TwoFactorEnabled,
        LockoutEnd,
        LockoutEnabled,
        AccessFailedCount,
        AddedBy,
        AddedOn,
        IMEI,
        IPAddress,
        Latitude,
        Longitude,
        MacAddress,
        ModifiedBy,
        ModifiedOn,
        RecordDateTime,
        Password,
        ISACT,
        Role,
        ProfilePhoto,
        UID,
        intProvinceID,
        intDivisionID,
        intDistrictID,
        intOfficeID,
        intWingID,
        intBranchID,
        intDesignationID,
        LastLoggedIn,
        Gender
      FROM AspNetUsers
      WHERE ISACT = 1
    `);
    
    console.log(`✅ Found ${dsUsers.recordset.length} users in DS database\n`);
    
    // Connect to IMS database
    console.log(`🔗 Connecting to IMS database: ${imsConfig.database}`);
    imsPool = await new sql.ConnectionPool(imsConfig).connect();
    console.log('✅ Connected to IMS database\n');
    
    // Sync each user
    console.log('🔄 Syncing users to IMS database...');
    let newUsers = 0;
    let updatedUsers = 0;
    let errors = 0;
    
    for (const user of dsUsers.recordset) {
      try {
        // Check if user exists in IMS
        const existingUser = await imsPool.request()
          .input('id', sql.NVarChar, user.Id)
          .query('SELECT Id FROM AspNetUsers WHERE Id = @id');
        
        if (existingUser.recordset.length === 0) {
          // Insert new user
          await imsPool.request()
            .input('Id', sql.NVarChar, user.Id)
            .input('FullName', sql.NVarChar, user.FullName)
            .input('FatherOrHusbandName', sql.NVarChar, user.FatherOrHusbandName)
            .input('CNIC', sql.NVarChar, user.CNIC)
            .input('UserName', sql.NVarChar, user.UserName)
            .input('NormalizedUserName', sql.NVarChar, user.NormalizedUserName)
            .input('Email', sql.NVarChar, user.Email)
            .input('NormalizedEmail', sql.NVarChar, user.NormalizedEmail)
            .input('EmailConfirmed', sql.Bit, user.EmailConfirmed)
            .input('PasswordHash', sql.NVarChar, user.PasswordHash)
            .input('SecurityStamp', sql.NVarChar, user.SecurityStamp)
            .input('ConcurrencyStamp', sql.NVarChar, user.ConcurrencyStamp)
            .input('PhoneNumber', sql.NVarChar, user.PhoneNumber)
            .input('PhoneNumberConfirmed', sql.Bit, user.PhoneNumberConfirmed)
            .input('TwoFactorEnabled', sql.Bit, user.TwoFactorEnabled)
            .input('LockoutEnd', sql.DateTimeOffset, user.LockoutEnd)
            .input('LockoutEnabled', sql.Bit, user.LockoutEnabled)
            .input('AccessFailedCount', sql.Int, user.AccessFailedCount)
            .input('AddedBy', sql.NVarChar, user.AddedBy)
            .input('AddedOn', sql.DateTime2, user.AddedOn)
            .input('IMEI', sql.NVarChar, user.IMEI)
            .input('IPAddress', sql.NVarChar, user.IPAddress)
            .input('Latitude', sql.NVarChar, user.Latitude)
            .input('Longitude', sql.NVarChar, user.Longitude)
            .input('MacAddress', sql.NVarChar, user.MacAddress)
            .input('ModifiedBy', sql.NVarChar, user.ModifiedBy)
            .input('ModifiedOn', sql.DateTime2, user.ModifiedOn)
            .input('RecordDateTime', sql.DateTime2, user.RecordDateTime)
            .input('Password', sql.NVarChar, user.Password)
            .input('ISACT', sql.Bit, user.ISACT)
            .input('Role', sql.NVarChar, user.Role)
            .input('ProfilePhoto', sql.NVarChar, user.ProfilePhoto)
            .input('UID', sql.Int, user.UID)
            .input('intProvinceID', sql.Int, user.intProvinceID)
            .input('intDivisionID', sql.Int, user.intDivisionID)
            .input('intDistrictID', sql.Int, user.intDistrictID)
            .input('intOfficeID', sql.Int, user.intOfficeID)
            .input('intWingID', sql.Int, user.intWingID)
            .input('intBranchID', sql.Int, user.intBranchID)
            .input('intDesignationID', sql.Int, user.intDesignationID)
            .input('LastLoggedIn', sql.DateTime, user.LastLoggedIn)
            .input('Gender', sql.Int, user.Gender)
            .query(`
              INSERT INTO AspNetUsers (
                Id, FullName, FatherOrHusbandName, CNIC, UserName, NormalizedUserName,
                Email, NormalizedEmail, EmailConfirmed, PasswordHash, SecurityStamp,
                ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled,
                LockoutEnd, LockoutEnabled, AccessFailedCount, AddedBy, AddedOn,
                IMEI, IPAddress, Latitude, Longitude, MacAddress, ModifiedBy,
                ModifiedOn, RecordDateTime, Password, ISACT, Role, ProfilePhoto,
                UID, intProvinceID, intDivisionID, intDistrictID, intOfficeID,
                intWingID, intBranchID, intDesignationID, LastLoggedIn, Gender
              ) VALUES (
                @Id, @FullName, @FatherOrHusbandName, @CNIC, @UserName, @NormalizedUserName,
                @Email, @NormalizedEmail, @EmailConfirmed, @PasswordHash, @SecurityStamp,
                @ConcurrencyStamp, @PhoneNumber, @PhoneNumberConfirmed, @TwoFactorEnabled,
                @LockoutEnd, @LockoutEnabled, @AccessFailedCount, @AddedBy, @AddedOn,
                @IMEI, @IPAddress, @Latitude, @Longitude, @MacAddress, @ModifiedBy,
                @ModifiedOn, @RecordDateTime, @Password, @ISACT, @Role, @ProfilePhoto,
                @UID, @intProvinceID, @intDivisionID, @intDistrictID, @intOfficeID,
                @intWingID, @intBranchID, @intDesignationID, @LastLoggedIn, @Gender
              )
            `);
          
          console.log(`  ✅ Added new user: ${user.UserName}`);
          newUsers++;
        } else {
          // Update existing user
          await imsPool.request()
            .input('Id', sql.NVarChar, user.Id)
            .input('FullName', sql.NVarChar, user.FullName)
            .input('FatherOrHusbandName', sql.NVarChar, user.FatherOrHusbandName)
            .input('CNIC', sql.NVarChar, user.CNIC)
            .input('UserName', sql.NVarChar, user.UserName)
            .input('NormalizedUserName', sql.NVarChar, user.NormalizedUserName)
            .input('Email', sql.NVarChar, user.Email)
            .input('NormalizedEmail', sql.NVarChar, user.NormalizedEmail)
            .input('EmailConfirmed', sql.Bit, user.EmailConfirmed)
            .input('PasswordHash', sql.NVarChar, user.PasswordHash)
            .input('SecurityStamp', sql.NVarChar, user.SecurityStamp)
            .input('ConcurrencyStamp', sql.NVarChar, user.ConcurrencyStamp)
            .input('PhoneNumber', sql.NVarChar, user.PhoneNumber)
            .input('PhoneNumberConfirmed', sql.Bit, user.PhoneNumberConfirmed)
            .input('TwoFactorEnabled', sql.Bit, user.TwoFactorEnabled)
            .input('LockoutEnd', sql.DateTimeOffset, user.LockoutEnd)
            .input('LockoutEnabled', sql.Bit, user.LockoutEnabled)
            .input('AccessFailedCount', sql.Int, user.AccessFailedCount)
            .input('AddedBy', sql.NVarChar, user.AddedBy)
            .input('AddedOn', sql.DateTime2, user.AddedOn)
            .input('IMEI', sql.NVarChar, user.IMEI)
            .input('IPAddress', sql.NVarChar, user.IPAddress)
            .input('Latitude', sql.NVarChar, user.Latitude)
            .input('Longitude', sql.NVarChar, user.Longitude)
            .input('MacAddress', sql.NVarChar, user.MacAddress)
            .input('ModifiedBy', sql.NVarChar, user.ModifiedBy)
            .input('ModifiedOn', sql.DateTime2, user.ModifiedOn)
            .input('RecordDateTime', sql.DateTime2, user.RecordDateTime)
            .input('Password', sql.NVarChar, user.Password)
            .input('ISACT', sql.Bit, user.ISACT)
            .input('Role', sql.NVarChar, user.Role)
            .input('ProfilePhoto', sql.NVarChar, user.ProfilePhoto)
            .input('UID', sql.Int, user.UID)
            .input('intProvinceID', sql.Int, user.intProvinceID)
            .input('intDivisionID', sql.Int, user.intDivisionID)
            .input('intDistrictID', sql.Int, user.intDistrictID)
            .input('intOfficeID', sql.Int, user.intOfficeID)
            .input('intWingID', sql.Int, user.intWingID)
            .input('intBranchID', sql.Int, user.intBranchID)
            .input('intDesignationID', sql.Int, user.intDesignationID)
            .input('LastLoggedIn', sql.DateTime, user.LastLoggedIn)
            .input('Gender', sql.Int, user.Gender)
            .query(`
              UPDATE AspNetUsers SET
                FullName = @FullName,
                FatherOrHusbandName = @FatherOrHusbandName,
                CNIC = @CNIC,
                UserName = @UserName,
                NormalizedUserName = @NormalizedUserName,
                Email = @Email,
                NormalizedEmail = @NormalizedEmail,
                EmailConfirmed = @EmailConfirmed,
                PasswordHash = @PasswordHash,
                SecurityStamp = @SecurityStamp,
                ConcurrencyStamp = @ConcurrencyStamp,
                PhoneNumber = @PhoneNumber,
                PhoneNumberConfirmed = @PhoneNumberConfirmed,
                TwoFactorEnabled = @TwoFactorEnabled,
                LockoutEnd = @LockoutEnd,
                LockoutEnabled = @LockoutEnabled,
                AccessFailedCount = @AccessFailedCount,
                AddedBy = @AddedBy,
                AddedOn = @AddedOn,
                IMEI = @IMEI,
                IPAddress = @IPAddress,
                Latitude = @Latitude,
                Longitude = @Longitude,
                MacAddress = @MacAddress,
                ModifiedBy = @ModifiedBy,
                ModifiedOn = @ModifiedOn,
                RecordDateTime = @RecordDateTime,
                Password = @Password,
                ISACT = @ISACT,
                Role = @Role,
                ProfilePhoto = @ProfilePhoto,
                UID = @UID,
                intProvinceID = @intProvinceID,
                intDivisionID = @intDivisionID,
                intDistrictID = @intDistrictID,
                intOfficeID = @intOfficeID,
                intWingID = @intWingID,
                intBranchID = @intBranchID,
                intDesignationID = @intDesignationID,
                LastLoggedIn = @LastLoggedIn,
                Gender = @Gender
              WHERE Id = @Id
            `);
          
          console.log(`  ♻️  Updated user: ${user.UserName}`);
          updatedUsers++;
        }
      } catch (err) {
        console.error(`  ❌ Error syncing user ${user.UserName}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ User sync completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total users in DS: ${dsUsers.recordset.length}`);
    console.log(`   • New users added: ${newUsers}`);
    console.log(`   • Existing users updated: ${updatedUsers}`);
    console.log(`   • Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close connections
    if (dsPool) {
      try {
        await dsPool.close();
        console.log('🔌 DS database connection closed');
      } catch (err) {
        console.error('Error closing DS connection:', err.message);
      }
    }
    if (imsPool) {
      try {
        await imsPool.close();
        console.log('🔌 IMS database connection closed');
      } catch (err) {
        console.error('Error closing IMS connection:', err.message);
      }
    }
  }
}

// Run the sync
console.log('\n' + '='.repeat(60));
console.log('  AspNetUsers Sync: DS → IMS');
console.log('='.repeat(60) + '\n');

syncUsers()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
