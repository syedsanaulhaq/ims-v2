-- Test direct insertion into stock_transactions_clean to debug unit_price error

DECLARE @id UNIQUEIDENTIFIER = NEWID();
DECLARE @tender_id UNIQUEIDENTIFIER = 'BC43DDD6-BCD4-49F6-B19C-FC1D49BF25AC';
DECLARE @item_master_id UNIQUEIDENTIFIER = NEWID(); -- Mock ID for testing
DECLARE @now DATETIME2 = GETDATE();

INSERT INTO stock_transactions_clean (
    id, tender_id, item_master_id, estimated_unit_price, 
    actual_unit_price, total_quantity_received, pricing_confirmed,
    type, created_at, updated_at
) VALUES (
    @id, @tender_id, @item_master_id, 100.00,
    100.00, 0, 1,
    'IN', @now, @now
);

PRINT 'Test insertion successful';