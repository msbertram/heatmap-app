async function testAlternatives() {
    console.log("Testing Alternatives for Georgia Tracts...\n");

    // Test 1: TIGERweb Single County (Fulton - 121)
    try {
        const t0 = performance.now();
        const url1 = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/4/query?where=STATE='13' AND COUNTY='121'&outFields=GEOID&outSR=4326&f=geojson`;
        const res1 = await fetch(url1);
        const t1 = performance.now();
        console.log(`1. TIGERweb (Fulton County Only): ${res1.status} (${(t1 - t0).toFixed(0)}ms)`);
        if (res1.ok) {
            const data = await res1.json();
            console.log(`   Features: ${data.features?.length}`);
        }
    } catch (e) { console.error("   Failed:", e.message); }

    // Test 2: GitHub Raw (Logan Powell 2021)
    try {
        const t0 = performance.now();
        // 2021 500k resolution (simpler)
        const url2 = `https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/500k/2021/13/tract.json`;
        const res2 = await fetch(url2);
        const t1 = performance.now();
        console.log(`2. GitHub Raw (Logan Powell 2021): ${res2.status} (${(t1 - t0).toFixed(0)}ms)`);
        console.log(`   Size: ${res2.headers.get('content-length')} bytes`);
        if (res2.ok) {
            // validating json
            const data = await res2.json();
            console.log(`   Features: ${data.features?.length}`);
        }
    } catch (e) { console.error("   Failed:", e.message); }
}

testAlternatives();
