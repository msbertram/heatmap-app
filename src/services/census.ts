export interface TractData {
    GEOID: string;
    income: number | null;
    population: number; // Pop usually 0 if missing
    homeValue: number | null;
    renterRate: number | null;
    educationRate: number | null;
    employmentRate: number | null;
    povertyRate: number | null;
}

const CENSUS_API_KEY = process.env.NEXT_PUBLIC_CENSUS_API_KEY;

// Variables
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

export async function fetchGeorgiaTractsGeoJSON() {
    // Use static file from GitHub (Logan Powell, Census Bureau 2021) for performance.
    // Querying TIGERweb for the whole state dynamically is too slow/times out.
    const url = `https://raw.githubusercontent.com/loganpowell/census-geojson/master/GeoJSON/500k/2021/13/tract.json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Tract Geometry');
    return res.json();
}

// Helper to handle Census "null" values (often -666666666)
function parseCensusValue(val: string): number | null {
    const intVal = parseInt(val);
    if (isNaN(intVal) || intVal < 0) return null;
    return intVal;
}

export async function fetchTractDemographics() {
    // API Key is optional for small queries/testing
    const apiKeyPart = CENSUS_API_KEY ? `&key=${CENSUS_API_KEY}` : '';

    // Fetch for all tracts in state 13 (GA)
    const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:*&in=state:13${apiKeyPart}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Demographic Data');

    const data = await res.json();
    // data[0] is headers: ["NAME", "B19013_001E", ..., "state", "county", "tract"]

    const headers = data[0];
    const rows = data.slice(1);

    // Transform to cleaner object map: { [GEOID]: { income, pop... } }
    const formatted: Record<string, TractData> = {};

    rows.forEach((row: any[]) => {
        // Construct GEOID from state+county+tract
        const state = row[headers.indexOf('state')];
        const county = row[headers.indexOf('county')];
        const tract = row[headers.indexOf('tract')];
        const geoid = `${state}${county}${tract}`;

        const income = parseCensusValue(row[headers.indexOf('B19013_001E')]);
        const pop = parseInt(row[headers.indexOf('B01003_001E')]) || 0;
        const homeValue = parseCensusValue(row[headers.indexOf('B25077_001E')]);

        // Tenure
        const tenureTotal = parseCensusValue(row[headers.indexOf('B25003_001E')]) || 0;
        const tenureRenter = parseCensusValue(row[headers.indexOf('B25003_003E')]) || 0;
        const renterRate = tenureTotal > 0 ? (tenureRenter / tenureTotal) : null;

        // Education (Bach+)
        const eduTotal = parseCensusValue(row[headers.indexOf('B15003_001E')]) || 0;
        const bach = parseCensusValue(row[headers.indexOf('B15003_022E')]) || 0;
        const mast = parseCensusValue(row[headers.indexOf('B15003_023E')]) || 0;
        const prof = parseCensusValue(row[headers.indexOf('B15003_024E')]) || 0;
        const doct = parseCensusValue(row[headers.indexOf('B15003_025E')]) || 0;
        const educationRate = eduTotal > 0 ? ((bach + mast + prof + doct) / eduTotal) : null;

        // Employment
        const laborForce = parseCensusValue(row[headers.indexOf('B23025_003E')]) || 0;
        const employed = parseCensusValue(row[headers.indexOf('B23025_004E')]) || 0;
        const employmentRate = laborForce > 0 ? (employed / laborForce) : null;

        // Poverty
        const povTotal = parseCensusValue(row[headers.indexOf('B17001_001E')]) || 0;
        const belowPov = parseCensusValue(row[headers.indexOf('B17001_002E')]) || 0;
        const povertyRate = povTotal > 0 ? (belowPov / povTotal) : null;

        formatted[geoid] = {
            GEOID: geoid,
            income,
            population: pop,
            homeValue,
            renterRate,
            educationRate,
            employmentRate,
            povertyRate
        };
    });

    return formatted;
}

// Calculate bounding box from center point and radius
export function calculateBoundingBox(center: [number, number], radiusMiles: number): {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
} {
    // Approximate degrees per mile (varies by latitude, but good enough for bounding box)
    const milesPerDegreeLat = 69;
    const milesPerDegreeLng = Math.cos(center[1] * Math.PI / 180) * 69;

    const latDelta = radiusMiles / milesPerDegreeLat;
    const lngDelta = radiusMiles / milesPerDegreeLng;

    return {
        minLng: center[0] - lngDelta,
        minLat: center[1] - latDelta,
        maxLng: center[0] + lngDelta,
        maxLat: center[1] + latDelta
    };
}

// Fetch tracts within bounding box (nationwide)
export async function fetchTractsByBoundingBox(bbox: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
}) {
    // API Key is optional for small queries
    const apiKeyPart = CENSUS_API_KEY ? `&key=${CENSUS_API_KEY}` : '';

    // Use Census Cartographic Boundary Files API
    // Note: This fetches ALL US tracts, then we filter client-side
    // For production, you'd want a backend service with PostGIS
    const geoUrl = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/6/query?where=1%3D1&outFields=*&geometry=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outSR=4326&f=geojson`;

    const res = await fetch(geoUrl);
    if (!res.ok) throw new Error('Failed to fetch tract geometry');
    const geoJSON = await res.json();

    // Extract GEOIDs for demographic fetch
    const geoids = geoJSON.features.map((f: any) => f.properties.GEOID);

    if (geoids.length === 0) {
        return { geoJSON, demographics: {} };
    }

    // Fetch demographics for these specific tracts
    // We need to batch by state since Census API requires state parameter
    const stateGroups: Record<string, string[]> = {};
    geoids.forEach((geoid: string) => {
        const state = geoid.substring(0, 2);
        if (!stateGroups[state]) stateGroups[state] = [];
        stateGroups[state].push(geoid);
    });

    // Fetch demographics for each state
    const demographicsPromises = Object.entries(stateGroups).map(async ([state, tractIds]) => {
        const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,${VARIABLES}&for=tract:*&in=state:${state}${apiKeyPart}`;
        console.log(`Fetching demographics for state ${state} (tracts: ${tractIds.length})`);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch demographics for state ${state}`);

        const data = await res.json();
        const headers = data[0];
        const rows = data.slice(1);

        const formatted: Record<string, TractData> = {};

        rows.forEach((row: any[]) => {
            const stateCode = row[headers.indexOf('state')];
            const county = row[headers.indexOf('county')];
            const tract = row[headers.indexOf('tract')];
            const geoid = `${stateCode}${county}${tract}`;

            // Only include tracts in our bounding box
            if (!tractIds.includes(geoid)) return;

            const income = parseCensusValue(row[headers.indexOf('B19013_001E')]);
            const pop = parseInt(row[headers.indexOf('B01003_001E')]) || 0;
            const homeValue = parseCensusValue(row[headers.indexOf('B25077_001E')]);

            const tenureTotal = parseCensusValue(row[headers.indexOf('B25003_001E')]) || 0;
            const tenureRenter = parseCensusValue(row[headers.indexOf('B25003_003E')]) || 0;
            const renterRate = tenureTotal > 0 ? (tenureRenter / tenureTotal) : null;

            const eduTotal = parseCensusValue(row[headers.indexOf('B15003_001E')]) || 0;
            const bach = parseCensusValue(row[headers.indexOf('B15003_022E')]) || 0;
            const mast = parseCensusValue(row[headers.indexOf('B15003_023E')]) || 0;
            const prof = parseCensusValue(row[headers.indexOf('B15003_024E')]) || 0;
            const doct = parseCensusValue(row[headers.indexOf('B15003_025E')]) || 0;
            const educationRate = eduTotal > 0 ? ((bach + mast + prof + doct) / eduTotal) : null;

            const laborForce = parseCensusValue(row[headers.indexOf('B23025_003E')]) || 0;
            const employed = parseCensusValue(row[headers.indexOf('B23025_004E')]) || 0;
            const employmentRate = laborForce > 0 ? (employed / laborForce) : null;

            const povTotal = parseCensusValue(row[headers.indexOf('B17001_001E')]) || 0;
            const belowPov = parseCensusValue(row[headers.indexOf('B17001_002E')]) || 0;
            const povertyRate = povTotal > 0 ? (belowPov / povTotal) : null;

            formatted[geoid] = {
                GEOID: geoid,
                income,
                population: pop,
                homeValue,
                renterRate,
                educationRate,
                employmentRate,
                povertyRate
            };
        });

        return formatted;
    });

    const demographicsArrays = await Promise.all(demographicsPromises);
    const demographics = Object.assign({}, ...demographicsArrays);

    return { geoJSON, demographics };
}
