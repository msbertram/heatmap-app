const CENSUS_API_KEY = '8d551db6b8fd11d1c2d0fd88655f810db32a97c6';
const VARIABLES = 'B19013_001E,B01003_001E,B25077_001E,B25003_001E,B25003_003E';

async function testFetch() {
    console.log("1. Testing TigerWeb (Geometry)...");
    try {
        const t0 = performance.now();
        const url1 = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/4/query?where=STATE='13'&outFields=GEOID&outSR=4326&f=geojson`;
        const res1 = await fetch(url1);
        const t1 = performance.now();
        console.log(`TigerWeb Status: ${res1.status} (${(t1 - t0).toFixed(0)}ms)`);
        if (!res1.ok) console.log("TigerWeb Error Text:", await res1.text());
        else {
            const data = await res1.json();
            console.log("TigerWeb Features:", data.features?.length);
        }
    } catch (e) {
        console.error("TigerWeb Failed:", e.message);
    }

    console.log("\n2. Testing Census API (Data)...");
    try {
        const t2 = performance.now();
        const url2 = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:*&in=state:13&key=${CENSUS_API_KEY}`;
        const res2 = await fetch(url2);
        const t3 = performance.now();
        console.log(`Census API Status: ${res2.status} (${(t3 - t2).toFixed(0)}ms)`);
        if (!res2.ok) console.log("Census API Error Text:", await res2.text());
        else {
            const data = await res2.json();
            console.log("Census Rows:", data.length);
        }
    } catch (e) {
        console.error("Census API Failed:", e.message);
    }
}

testFetch();
