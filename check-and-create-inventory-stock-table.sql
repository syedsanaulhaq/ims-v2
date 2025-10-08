-- Check if current_inventory_stock table exists and create it if not
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'current_inventory_stock')
BEGIN
    PRINT 'Creating current_inventory_stock table...';
    
    CREATE TABLE current_inventory_stock (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        item_master_id INT NOT NULL,
        current_quantity INT NOT NULL DEFAULT 0,
        available_quantity INT NOT NULL DEFAULT 0,
        reserved_quantity INT NOT NULL DEFAULT 0,
        minimum_stock_level INT DEFAULT 0,
        maximum_stock_level INT DEFAULT 0,
        reorder_point INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        last_updated DATETIME2 DEFAULT GETDATE(),
        updated_by NVARCHAR(100),
        FOREIGN KEY (item_master_id) REFERENCES item_masters(item_id)
    );
    
    PRINT 'current_inventory_stock table created successfully.';
END
ELSE
BEGIN
    PRINT 'current_inventory_stock table already exists.';
    
    -- Show table structure
    SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE,
        COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'current_inventory_stock'
    ORDER BY ORDINAL_POSITION;
END

-- Check if there are any existing records
SELECT COUNT(*) as RecordCount FROM current_inventory_stock;