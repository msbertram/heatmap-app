
const https = require('https');

// Sample: Georgia (State 13)
// Full Variables from census.ts
const VARIABLES = [
    'B19013_001E', // Med Income
    'B01003_001E', // Total Pop
    'B25077_001E', // Home Value
    'B25003_001E', // Tenure Total
    'B25003_003E', // Renter
    'B15003_001E', // Edu Total (25+)
    'B15003_022E', // Bach
    'B15003_023E', // Mast
    'B15003_024E', // Prof
    'B15003_025E', // Doct
    'B23025_003E', // Civ Labor Force
    'B23025_004E', // Employed
    'B17001_001E', // Pov Total
    'B17001_002E'  // Below Pov
].join(',');

// Test 3: All Tracts in State 13 (Georgia) with ALL Variables WITHOUT KEY
const urlState = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:*&in=state:13`;

console.log('Testing Full Variables (No Key):', urlState);

const req = https.get(urlState, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('Success! Received data length:', data.length);
            console.log('Snippet:', data.substring(0, 100));
        } else {
            console.error('Failed. Status:', res.statusCode);
            console.log('Response:', data.substring(0, 500));
        }
    });
});

req.on('error', e => console.error('Error:', e.message));
