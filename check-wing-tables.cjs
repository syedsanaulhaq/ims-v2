const { getPool, sql, initializePool } = require('./server/db/connection.cjs');

(async () => {
  try {
    await initializePool();
    const pool = getPool();
    
    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'approval_items' ORDER BY ORDINAL_POSITION
    `);
    console.table(cols.recordset);
    
    const idx = await pool.request().query(`
      SELECT i.name, ic.key_ordinal, c.name as col_name, i.is_unique, i.is_primary_key
      FROM sys.indexes i 
      JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID('approval_items')
    `);
    console.log('Indexes:');
    console.table(idx.recordset);
    
    // Check for FK constraints
    const fk = await pool.request().query(`
      SELECT fk.name, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as col,
             OBJECT_NAME(fkc.referenced_object_id) as ref_table,
             COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as ref_col
      FROM sys.foreign_keys fk
      JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      WHERE fk.parent_object_id = OBJECT_ID('approval_items')
    `);
    console.log('Foreign Keys:');
    console.table(fk.recordset);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
