const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.sqlserver' });

console.log('🚀 IMS Database Setup Script');
console.log('=====================================');

// Database configuration
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: 'master', // Connect to master to create database
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

async function setupDatabase() {
    try {
        console.log('📡 Connecting to SQL Server...');
        const pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');

        // Create database if it doesn't exist
        const dbName = process.env.DB_DATABASE || 'IMS_Database';
        console.log(`🏗️  Creating database: ${dbName}`);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName}')
            BEGIN
                CREATE DATABASE [${dbName}]
            END
        `);
        
        console.log('✅ Database created/verified');

        // Close connection and reconnect to the new database
        await pool.close();
        config.database = dbName;
        const dbPool = await sql.connect(config);

        console.log('📋 Running database schema scripts...');

        // List of SQL files to execute in order
        const sqlFiles = [
            'create-complete-database-schema.sql',
            'create-realistic-sample-data.sql',
            'create-sample-item-masters.sql',
            'create-test-users.sql'
        ];

        for (const fileName of sqlFiles) {
            const filePath = path.join(__dirname, fileName);
            if (fs.existsSync(filePath)) {
                console.log(`⚡ Executing: ${fileName}`);
                const sqlScript = fs.readFileSync(filePath, 'utf8');
                
                // Split by GO statements and execute separately
                const batches = sqlScript.split(/^\s*GO\s*$/gim);
                
                for (const batch of batches) {
                    const trimmedBatch = batch.trim();
                    if (trimmedBatch.length > 0) {
                        try {
                            await dbPool.request().query(trimmedBatch);
                        } catch (batchError) {
                            console.log(`⚠️  Warning in ${fileName}: ${batchError.message}`);
                        }
                    }
                }
                console.log(`✅ Completed: ${fileName}`);
            } else {
                console.log(`⚠️  File not found: ${fileName}`);
            }
        }

        console.log('🎉 Database setup completed successfully!');
        console.log('=====================================');
        console.log('Next steps:');
        console.log('1. Start the backend: node backend-server.cjs');
        console.log('2. Start the frontend: npm run dev');
        console.log('3. Access the system at: http://localhost:3000');

        await dbPool.close();

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.log('=====================================');
        console.log('Troubleshooting:');
        console.log('1. Check your database credentials in .env.sqlserver');
        console.log('2. Ensure SQL Server is running');
        console.log('3. Verify network connectivity to the database server');
        process.exit(1);
    }
}

// Run the setup
setupDatabase();
