require('dotenv').config();
const { connectDB, getPool, closeDB } = require('./config/db');
const fs = require('fs');

async function getSchema() {
  await connectDB();
  const pool = getPool();
  
  // Get all tables and columns
  const colsRes = await pool.request().query(`
    SELECT 
      t.name AS TableName,
      c.name AS ColumnName,
      ty.name AS DataType,
      ISNULL(i.is_primary_key, 0) AS IsPrimaryKey
    FROM sys.tables t
    INNER JOIN sys.columns c ON t.object_id = c.object_id
    INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    LEFT JOIN sys.index_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    LEFT JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND i.is_primary_key = 1
    WHERE t.is_ms_shipped = 0
    ORDER BY t.name, c.column_id;
  `);

  // Get foreign keys
  const fkRes = await pool.request().query(`
    SELECT 
      tp.name AS ParentTable,
      cp.name AS ParentColumn,
      tr.name AS ReferencedTable,
      cr.name AS ReferencedColumn
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables tp ON fkc.parent_object_id = tp.object_id
    INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN sys.tables tr ON fkc.referenced_object_id = tr.object_id
    INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
  `);

  await closeDB();
  
  fs.writeFileSync('schema.json', JSON.stringify({
    columns: colsRes.recordset,
    fks: fkRes.recordset
  }, null, 2));
  
  console.log("Schema dumped to schema.json");
}

getSchema().catch(console.error);
