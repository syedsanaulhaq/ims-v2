# =====================================================
# TEST DATABASE SETUP GUIDE
# =====================================================
# How to create and switch to test database
# =====================================================

## STEP 1: Create Test Database

1. Open SQL Server Management Studio (SSMS)
2. Connect to your SQL Server instance
3. Run these SQL scripts IN ORDER:

   a) `setup-test-database-simple.sql`
      - This creates empty INVMIS_TEST database

   b) `create-complete-database-schema.sql`
      - Change the first line to: USE INVMIS_TEST;
      - Run the entire script
      - This creates all tables, constraints, indexes

   c) `copy-reference-data-to-test.sql`
      - Run this to copy essential data
      - Copies: AspNetUsers, Users, Offices, Wings, Categories, Vendors
      - Does NOT copy: Inventory items, transactions, requests

## STEP 2: Update Backend .env File

Update your backend `.env` file to point to test database:

```env
# Database Configuration - TEST ENVIRONMENT
DB_SERVER=localhost
DB_DATABASE=INVMIS_TEST
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_PORT=1433

# Environment
NODE_ENV=test
```

## STEP 3: Restart Backend Server

```bash
# Stop current server (Ctrl+C)
# Start again
npm run server
```

## STEP 4: Verify Test Database Connection

Open browser: http://localhost:8080

- Dashboard should show ZERO items (clean database)
- Initial Setup should be available
- Users can still login (user data copied)

## SWITCHING BETWEEN ENVIRONMENTS

### Switch to DEVELOPMENT (INVMIS)
```env
DB_DATABASE=INVMIS
NODE_ENV=development
```

### Switch to TEST (INVMIS_TEST)
```env
DB_DATABASE=INVMIS_TEST
NODE_ENV=test
```

### Switch to PRODUCTION (Future)
```env
DB_DATABASE=INVMIS_PROD
NODE_ENV=production
```

## TESTING WORKFLOW

1. Start with TEST database (INVMIS_TEST)
2. Go through Initial Setup
3. Add inventory items
4. Create stock requests
5. Test approval workflows
6. Test stock returns
7. Verify everything works

8. When satisfied, switch back to DEVELOPMENT
9. Keep TEST database for future testing
10. You can wipe TEST anytime and start fresh!

## QUICK RESET TEST DATABASE

To reset test database completely:

```sql
-- Run in SSMS
USE master;
DROP DATABASE INVMIS_TEST;
-- Then run setup scripts again
```

## DATABASE COMPARISON

| Database | Purpose | Data |
|----------|---------|------|
| INVMIS | Development | Your current working data |
| INVMIS_TEST | Testing | Clean, can be wiped anytime |
| INVMIS_PROD | Production | Future production data |

=====================================================
