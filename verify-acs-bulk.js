
const https = require('https');

// Sample: San Francisco Tract (State 06) and a Georgia one (State 13)
// Variables from census.ts
const VARIABLES = [
    'B19013_001E', // Med Income
    'B01003_001E', // Total Pop
].join(',');

// Test 2: All Tracts in State 13 (Georgia) WITHOUT KEY
// This mirrors the app's behavior (fetch all tracts for state)
// Using State 13 (GA) as it's what the original app used
const urlState = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:*&in=state:13`;

console.log('Testing Bulk Tracts (No Key):', urlState);

const req = https.get(urlState, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('Success! Received data length:', data.length);
            console.log('Snippet:', data.substring(0, 200));
        } else {
            console.error('Failed. likely requires API Key for bulk query.');
            console.log('Response:', data);
        }
    });
});

req.on('error', e => console.error('Error:', e.message));
