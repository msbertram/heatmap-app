
const https = require('https');

// Sample: San Francisco Tract (State 06, County 075, Tract 020500)
// GEOID: 06075020500
const state = '06';

// Variables from census.ts
const VARIABLES = [
    'B19013_001E', // Med Income
    'B01003_001E', // Total Pop
].join(',');

// Test 1: Single Tract (No Key)
const urlSingle = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:020500&in=state:${state}%20county:075`;

console.log('Testing Single Tract (No Key):', urlSingle);

const req1 = https.get(urlSingle, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Response:', data.substring(0, 200));

        // Test 2: All Tracts in State (Likely Fails without Key or is massive)
        // We simulate the app's call pattern but need to be careful with rate limits
        if (res.statusCode === 200) {
            console.log("Single tract fetch succeeded without key.");
        } else {
            console.error("Single tract fetch failed. API Key likely required.");
        }
    });
});

req1.on('error', e => console.error('Error:', e.message));
