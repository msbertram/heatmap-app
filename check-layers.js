
const https = require('https');

const url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2022/MapServer/layers?f=json';

https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const tracts = json.layers.find(l => l.name === 'Census Tracts');
            const bgs = json.layers.find(l => l.name === 'Census Block Groups');

            console.log('Census Tracts Layer ID:', tracts ? tracts.id : 'Not Found');
            console.log('Block Groups Layer ID:', bgs ? bgs.id : 'Not Found');
        } catch (e) {
            console.error(e.message);
        }
    });
});
