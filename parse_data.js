// parse_data.js
const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('LARGE-DATA.csv') 
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
  })
  .on('end', () => {
    // Write out to JSON
    fs.writeFileSync('public/LARGE-DATA.json', JSON.stringify(results, null, 2));
    console.log('CSV converted to JSON!');
  });
