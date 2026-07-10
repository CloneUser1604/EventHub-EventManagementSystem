require('dotenv').config();
const sql=require('mssql');
const dbConfig = { 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DATABASE, 
  server: process.env.DB_SERVER, 
  options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: true } 
};
sql.connect(dbConfig).then(pool => 
  pool.request().query("IF COL_LENGTH('BlogComments', 'ImageURL') IS NULL ALTER TABLE BlogComments ADD ImageURL NVARCHAR(MAX)")
    .then(() => console.log('ImageURL column ensured in BlogComments'))
    .catch(e => console.log('Error:', e.message))
    .finally(() => process.exit(0))
);
