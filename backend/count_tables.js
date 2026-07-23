const fs = require('fs');
const data = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
const tables = new Set();
data.columns.forEach(c => tables.add(c.TableName));
console.log('Total tables:', tables.size);
console.log('Tables:', Array.from(tables).sort().join(', '));
