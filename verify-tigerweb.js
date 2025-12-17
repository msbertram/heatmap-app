
const https = require('https');

// Calculate BBox for San Francisco (approx)
// Center: -122.4194, 37.7749
// Radius: 5 miles
const center = [-122.4194, 37.7749];
const radiusMiles = 5;

const milesPerDegreeLat = 69;
const milesPerDegreeLng = Math.cos(center[1] * Math.PI / 180) * 69;

const latDelta = radiusMiles / milesPerDegreeLat;
const lngDelta = radiusMiles / milesPerDegreeLng;

const bbox = {
    minLng: center[0] - lngDelta,
    minLat: center[1] - latDelta,
    maxLng: center[0] + lngDelta,
    maxLat: center[1] + latDelta
};

console.log('Testing TIGERweb query with BBox:', bbox);

const geoUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/8/query?where=1%3D1&outFields=GEOID&geometry=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson`;

console.log('URL:', geoUrl);

https.get(geoUrl, (res) => {
    console.log('Status Code:', res.statusCode);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            console.log('Response length:', data.length);
            // Check if HTML (error page) or JSON
            if (data.trim().startsWith('<')) {
                console.error('Received HTML instead of JSON. Likely an error page.');
                console.log(data.substring(0, 500));
                return;
            }

            const json = JSON.parse(data);
            if (json.error) {
                console.error('API Error:', json.error);
            } else if (json.features) {
                console.log(`Success! Found ${json.features.length} tracts.`);
                if (json.features.length > 0) {
                    console.log('Sample GEOID:', json.features[0].properties.GEOID);
                }
            } else {
                console.log('Unexpected response structure:', Object.keys(json));
            }
        } catch (e) {
            console.error('Parse Error:', e.message);
            console.log('Raw Data Start:', data.substring(0, 100));
        }
    });
}).on('error', (e) => {
    console.error('Network Error:', e.message);
});
