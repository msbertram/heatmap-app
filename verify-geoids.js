
const https = require('https');

// Sample: San Francisco
// TIGERweb Query (BBox)
// -122.45, 37.75, -122.40, 37.80
const tigerUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/8/query?where=1%3D1&outFields=GEOID&geometry=-122.45,37.75,-122.40,37.80&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson';

// Census ACS Query (Tract 205, SF County) - known to be in that area
const acsUrl = 'https://api.census.gov/data/2022/acs/acs5?get=NAME&for=tract:020500&in=state:06%20county:075';

console.log("Checking GEOID formats...");

// Fetch TIGERweb
const p1 = new Promise((resolve) => {
    https.get(tigerUrl, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            const json = JSON.parse(data);
            if (json.features && json.features.length > 0) {
                const id = json.features[0].properties.GEOID;
                console.log(`TIGERweb GEOID Example: "${id}" (Type: ${typeof id})`);
                resolve(id);
            } else {
                console.log("TIGERweb: No features found");
                resolve(null);
            }
        });
    });
});

// Fetch ACS
const p2 = new Promise((resolve) => {
    https.get(acsUrl, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            const json = JSON.parse(data);
            // [["NAME","state","county","tract"], ["Census Tract 205...", "06", "075", "020500"]]
            if (json.length > 1) {
                const row = json[1];
                const state = row[1];
                const county = row[2];
                const tract = row[3];
                const id = `${state}${county}${tract}`;
                console.log(`ACS Constructed GEOID:  "${id}" (Type: ${typeof id})`);
                resolve(id);
            } else {
                console.log("ACS: No data found");
                resolve(null);
            }
        });
    });
});
