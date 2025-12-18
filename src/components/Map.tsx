'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';

import rbush from 'rbush'; // spatial index
import SearchBar from './SearchBar';
import WeightControls, { Weights } from './WeightControls';
import RadiusStats, { RadiusData } from './RadiusStats';
import AuthButton from './auth/AuthButton';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useUserPreferences } from '@/lib/hooks/useUserPreferences';
import {
    calculateBoundingBox,
    fetchTractsByBoundingBox,
    TractData
} from '@/services/census';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
    initialCenter?: [number, number];
    initialZoom?: number;
}

interface TractCentroid {
    id: string;
    center: any; // using any to avoid Turf type import issues
    data: TractData & { density: number };
}

export default function Map({ initialCenter = [-83.5, 32.7], initialZoom = 6.5 }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const tractDataRef = useRef<TractCentroid[]>([]);
    const spatialIndexRef = useRef<any>(null);

    // Auth and preferences
    const { user } = useAuth();
    const { preferences, loading: prefsLoading, updatePreferences } = useUserPreferences(user);

    const [lng, setLng] = useState(initialCenter[0]);
    const [lat, setLat] = useState(initialCenter[1]);
    const [zoom, setZoom] = useState(initialZoom);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const [weights, setWeights] = useState<Weights>({
        income: 5,
        population: 0,
        homeValue: 0,
        renterRate: 0,
        educationRate: 0,
        employmentRate: 0,
        povertyRate: 0
    });
    const [opacity, setOpacity] = useState(preferences?.opacity ?? 0.15);
    const [radius, setRadius] = useState(preferences?.radius ?? 10);
    const [enabled, setEnabled] = useState<Record<keyof Weights, boolean>>({
        income: true,
        population: true,
        homeValue: true,
        renterRate: true,
        educationRate: true,
        employmentRate: true,
        povertyRate: true
    });
    const [radiusStats, setRadiusStats] = useState<{ r1: RadiusData | null; r3: RadiusData | null; r5: RadiusData | null } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);

    // Mount
    useEffect(() => setMounted(true), []);

    // Sync state with loaded preferences
    useEffect(() => {
        if (preferences) {
            setOpacity(preferences.opacity);
            setRadius(preferences.radius);
        }
    }, [preferences]);

    // Save preferences when opacity/radius change (debounced)
    useEffect(() => {
        if (!user || !preferences) return;

        const timer = setTimeout(() => {
            updatePreferences({ opacity, radius });
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [opacity, radius, user, preferences, updatePreferences]);

    // Auto-detect location for unauthenticated users via IP
    useEffect(() => {
        if (!mounted || !map.current || user || selectedLocation) return;

        detectUserLocation();
    }, [mounted, user, selectedLocation]);

    const detectUserLocation = async () => {
        const chicagoCoords: [number, number] = [-87.6298, 41.8781];

        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();

            // Check if we got valid data and it's in the US
            if (data.latitude && data.longitude && data.country_code === 'US') {
                const center: [number, number] = [data.longitude, data.latitude];
                handleLocationSelect(center);
            } else {
                // Not in US or invalid data - default to Chicago
                handleLocationSelect(chicagoCoords);
            }
        } catch (error) {
            console.error('Failed to detect location, defaulting to Chicago:', error);
            // API failed - default to Chicago
            handleLocationSelect(chicagoCoords);
        }
    };

    // Initialize Map
    useEffect(() => {
        if (!mounted || map.current) return;
        if (!mapContainer.current) return;
        if (!mapboxgl.supported()) { setError('mapboxgl not supported'); return; }
        if (!mapboxgl.accessToken) { setError('Mapbox token missing'); return; }
        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [lng, lat],
                zoom,
                attributionControl: false
            });
            const ro = new ResizeObserver(() => map.current?.resize());
            ro.observe(mapContainer.current);
        } catch (e: any) { setError(`Map init error: ${e.message}`); return; }
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
        map.current.on('error', e => setError(`Map error: ${e.error?.message || 'unknown'}`));
        map.current.on('move', () => {
            if (!map.current) return;
            setLng(parseFloat(map.current.getCenter().lng.toFixed(4)));
            setLat(parseFloat(map.current.getCenter().lat.toFixed(4)));
            setZoom(parseFloat(map.current.getZoom().toFixed(2)));
        });
        // Tooltip (same as before)
        map.current.on('mousemove', 'tracts-fill', e => {
            if (!map.current || !popupRef.current) return;
            map.current.getCanvas().style.cursor = 'pointer';
            if (!e.features?.length) return;
            const p = e.features[0].properties;
            if (!p) return;
            const fmtUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            const fmtNum = new Intl.NumberFormat('en-US');
            const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
            const html = `
        <div class="p-2 text-slate-900 bg-white/95 backdrop-blur rounded shadow-lg border border-slate-200 text-xs w-48">
          <h4 class="font-bold border-b border-slate-200 mb-1 pb-1">Tract: ${p.GEOID}</h4>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1">
            <span class="text-slate-500">Income:</span> <span class="font-semibold text-right">${p.income !== 'null' && p.income !== undefined ? fmtUSD.format(p.income) : 'N/A'}</span>
            <span class="text-slate-500">Home $:</span> <span class="font-semibold text-right">${p.homeValue !== 'null' && p.homeValue !== undefined ? fmtUSD.format(p.homeValue) : 'N/A'}</span>
            <span class="text-slate-500">Pop:</span> <span class="font-semibold text-right">${p.population ? fmtNum.format(p.population) : 'N/A'}</span>
            <span class="text-slate-500">Density:</span> <span class="font-semibold text-right">${p.density !== 'null' && p.density !== undefined ? fmtNum.format(Math.round(p.density)) : 'N/A'}<span class="text-[9px] text-slate-600">/sq mi</span></span>
            <span class="text-slate-500">Renters:</span> <span class="font-semibold text-right">${p.renterRate !== undefined ? fmtPct.format(p.renterRate) : 'N/A'}</span>
            <div class="col-span-2 border-t border-slate-100 my-1"></div>
            <span class="text-slate-500">Degree+:</span> <span class="font-semibold text-right">${p.educationRate !== 'null' && p.educationRate !== undefined ? fmtPct.format(p.educationRate) : 'N/A'}</span>
            <span class="text-slate-500">Employed:</span> <span class="font-semibold text-right">${p.employmentRate !== 'null' && p.employmentRate !== undefined ? fmtPct.format(p.employmentRate) : 'N/A'}</span>
            <span class="text-slate-500">Poverty:</span> <span class="font-semibold text-right text-red-600">${p.povertyRate !== 'null' && p.povertyRate !== undefined ? fmtPct.format(p.povertyRate) : 'N/A'}</span>
          </div>
        </div>`;
            popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map.current);
        });
        map.current.on('mouseleave', 'tracts-fill', () => {
            if (!map.current || !popupRef.current) return;
            map.current.getCanvas().style.cursor = '';
            popupRef.current.remove();
        });
    }, [mounted]);

    // Load data after address selection
    const loadDataForLocation = async (center: [number, number]) => {
        setIsLoading(true);
        setError(null);
        try {
            const bbox = calculateBoundingBox(center, radius);
            const { geoJSON, demographics } = await fetchTractsByBoundingBox(bbox);
            const densities: Record<string, number> = {};
            geoJSON.features.forEach((f: any) => {
                const id = f.properties.GEOID;
                const d = demographics[id];
                if (d && d.population > 0) {
                    const areaSqM = turf.area(f);
                    const areaSqMi = areaSqM / 2589988.11;
                    densities[id] = d.population / areaSqMi;
                } else {
                    densities[id] = 0;
                }
            });
            const centroids: TractCentroid[] = [];
            const index = new (rbush as any)();
            geoJSON.features.forEach((f: any) => {
                const id = f.properties.GEOID;
                const c = turf.center(f);
                const pt = c.geometry.coordinates as [number, number];
                const item = { minX: pt[0], minY: pt[1], maxX: pt[0], maxY: pt[1], id, centroid: c, data: { ...demographics[id], density: densities[id] || 0 } };
                index.insert(item);
                centroids.push({ id, center: c, data: { ...demographics[id], density: densities[id] || 0 } });
            });
            tractDataRef.current = centroids;
            spatialIndexRef.current = index;

            if (!map.current) return;
            const existingSource = map.current.getSource('tracts') as mapboxgl.GeoJSONSource;
            if (existingSource) {
                existingSource.setData(geoJSON);
            } else {
                map.current.addSource('tracts', { type: 'geojson', data: geoJSON });
                map.current.addLayer({ id: 'tracts-fill', type: 'fill', source: 'tracts', paint: { 'fill-color': '#555', 'fill-opacity': opacity } });
                map.current.addLayer({ id: 'tracts-line', type: 'line', source: 'tracts', paint: { 'line-color': '#000', 'line-width': 0.2, 'line-opacity': 0.2 } });
                map.current.addLayer({ id: 'tracts-highlight', type: 'line', source: 'tracts', paint: { 'line-color': '#fff', 'line-width': 2, 'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0] } });
            }
            calculateAndRenderScores();

            // Calculate stats after data is loaded
            const r1 = calculateRadiusStats(center, 1);
            const r3 = calculateRadiusStats(center, 3);
            const r5 = calculateRadiusStats(center, 5);
            setRadiusStats({ r1, r3, r5 });
        } catch (e: any) {
            setError(`Data load error: ${e.message}`);
        } finally { setIsLoading(false); }
    };

    const handleLocationSelect = (center: [number, number]) => {
        if (!map.current) return;
        setSelectedLocation(center);
        map.current.flyTo({ center, zoom: 12, essential: true });
        if (marker.current) marker.current.remove();
        marker.current = new mapboxgl.Marker({ color: '#fff' }).setLngLat(center).addTo(map.current);
        loadDataForLocation(center);
    };

    // Scoring
    const calculateAndRenderScores = () => {
        if (!map.current) return;
        const source = map.current.getSource('tracts') as mapboxgl.GeoJSONSource;
        if (!source) return;

        // Check if any metrics are enabled
        const enabledCount = Object.values(enabled).filter(Boolean).length;
        if (enabledCount === 0) {
            // No metrics enabled - show neutral gray
            map.current.setPaintProperty('tracts-fill', 'fill-color', '#555');
            return;
        }

        const getMultiplier = (k: keyof Weights) => enabled[k] ? 1 + weights[k] * 0.1 : 0;
        const consider = (c: TractCentroid) => {
            if (!selectedLocation) return true;
            const d = turf.distance(turf.point(selectedLocation), c.center, { units: 'miles' });
            return d <= radius;
        };
        // Determine mins/maxes for considered tracts
        const mins: any = {}, maxs: any = {};
        const factors = ['income', 'density', 'homeValue', 'renterRate', 'educationRate', 'employmentRate', 'povertyRate'];
        factors.forEach(f => { mins[f] = Infinity; maxs[f] = -Infinity; });
        tractDataRef.current.forEach(t => {
            if (!consider(t)) return;
            const d = t.data;
            if (d.income !== null) { mins.income = Math.min(mins.income, d.income); maxs.income = Math.max(maxs.income, d.income); }
            if (d.density > 0) { mins.density = Math.min(mins.density, d.density); maxs.density = Math.max(maxs.density, d.density); }
            if (d.homeValue !== null) { mins.homeValue = Math.min(mins.homeValue, d.homeValue); maxs.homeValue = Math.max(maxs.homeValue, d.homeValue); }
            if (d.renterRate !== null) { mins.renterRate = Math.min(mins.renterRate, d.renterRate); maxs.renterRate = Math.max(maxs.renterRate, d.renterRate); }
            if (d.educationRate !== null) { mins.educationRate = Math.min(mins.educationRate, d.educationRate); maxs.educationRate = Math.max(maxs.educationRate, d.educationRate); }
            if (d.employmentRate !== null) { mins.employmentRate = Math.min(mins.employmentRate, d.employmentRate); maxs.employmentRate = Math.max(maxs.employmentRate, d.employmentRate); }
            if (d.povertyRate !== null) { mins.povertyRate = Math.min(mins.povertyRate, d.povertyRate); maxs.povertyRate = Math.max(maxs.povertyRate, d.povertyRate); }
        });
        const calcScore = (val: number | null, min: number, max: number, invert = false) => {
            if (val === null || min === Infinity || max === -Infinity) return 5;
            const range = max - min;
            if (range === 0) return 5;
            let ratio = (val - min) / range;
            if (invert) ratio = 1 - ratio;
            return 1 + ratio * 9;
        };
        const scores: number[] = [];
        const scoreMap: Record<string, number> = {};
        tractDataRef.current.forEach(t => {
            if (!consider(t)) return;
            const d = t.data;
            const total =
                calcScore(d.income, mins.income, maxs.income) * getMultiplier('income') +
                calcScore(d.density, mins.density, maxs.density) * getMultiplier('population') +
                calcScore(d.homeValue, mins.homeValue, maxs.homeValue) * getMultiplier('homeValue') +
                calcScore(d.renterRate, mins.renterRate, maxs.renterRate) * getMultiplier('renterRate') +
                calcScore(d.educationRate, mins.educationRate, maxs.educationRate) * getMultiplier('educationRate') +
                calcScore(d.employmentRate, mins.employmentRate, maxs.employmentRate) * getMultiplier('employmentRate') +
                calcScore(d.povertyRate, mins.povertyRate, maxs.povertyRate, true) * getMultiplier('povertyRate');
            scores.push(total);
            scoreMap[t.id] = total;
        });
        if (scores.length === 0) return;
        scores.sort((a, b) => a - b);
        const deciles = [];
        for (let i = 1; i <= 10; i++) {
            const idx = Math.floor((scores.length * i) / 10) - 1;
            deciles.push(scores[Math.max(0, idx)]);
        }
        const colors = ['#b91c1c', '#dc2626', '#f97316', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#84cc16', '#22c55e', '#16a34a'];
        const sourceData = (source as any)._data;
        sourceData.features.forEach((f: any) => {
            f.properties.finalScore = scoreMap[f.properties.GEOID] ?? 0;
        });
        source.setData(sourceData);
        const stepExp: any[] = ['step', ['get', 'finalScore'], colors[0]];
        deciles.forEach((thr, i) => { stepExp.push(thr, colors[i]); });
        map.current?.setPaintProperty('tracts-fill', 'fill-color', stepExp as any);
    };

    // React to changes
    useEffect(() => {
        if (selectedLocation) calculateAndRenderScores();
    }, [weights, enabled, radius, selectedLocation]);

    // Opacity
    useEffect(() => {
        if (map.current && map.current.getLayer('tracts-fill')) {
            map.current.setPaintProperty('tracts-fill', 'fill-opacity', opacity);
        }
    }, [opacity]);

    // Radius stats helper (unchanged)
    const calculateRadiusStats = (center: [number, number], radiusMiles: number): RadiusData => {
        if (!tractDataRef.current.length) return { avgIncome: 0, avgHomeValue: 0, avgRenterRate: 0, popTotal: 0, avgEducation: 0, avgEmployment: 0, avgPoverty: 0 };
        const centerPt = turf.point(center);
        const inRadius = tractDataRef.current.filter(t => {
            const d = turf.distance(centerPt, t.center, { units: 'miles' });
            return d <= radiusMiles && t.data && t.data.population > 0;
        });
        if (inRadius.length === 0) return { avgIncome: 0, avgHomeValue: 0, avgRenterRate: 0, popTotal: 0, avgEducation: 0, avgEmployment: 0, avgPoverty: 0 };
        let totalPop = 0;
        let sumIncome = 0, sumHome = 0, sumRenter = 0, sumEdu = 0, sumEmp = 0, sumPov = 0;
        let cntInc = 0, cntHome = 0;
        inRadius.forEach(t => {
            const p = t.data.population;
            const d = t.data;
            totalPop += p;
            if (d.income !== null) { sumIncome += d.income * p; cntInc += p; }
            if (d.homeValue !== null) { sumHome += d.homeValue * p; cntHome += p; }
            if (d.renterRate !== null) sumRenter += d.renterRate * p;
            if (d.educationRate !== null) sumEdu += d.educationRate * p;
            if (d.employmentRate !== null) sumEmp += d.employmentRate * p;
            if (d.povertyRate !== null) sumPov += d.povertyRate * p;
        });
        return {
            popTotal: totalPop,
            avgIncome: cntInc > 0 ? sumIncome / cntInc : 0,
            avgHomeValue: cntHome > 0 ? sumHome / cntHome : 0,
            avgRenterRate: totalPop > 0 ? sumRenter / totalPop : 0,
            avgEducation: totalPop > 0 ? sumEdu / totalPop : 0,
            avgEmployment: totalPop > 0 ? sumEmp / totalPop : 0,
            avgPoverty: totalPop > 0 ? sumPov / totalPop : 0
        };
    };

    // Toggle enabled
    const toggleEnabled = (k: keyof Weights) => setEnabled(prev => ({ ...prev, [k]: !prev[k] }));

    if (!mounted) return null;

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <div ref={mapContainer} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur">
                    <div className="text-white text-xl font-semibold">Loading data for selected area…</div>
                </div>
            )}
            {error && (
                <div className="absolute inset-x-0 top-20 flex justify-center z-[100]">
                    <div className="bg-red-900/90 backdrop-blur text-white px-8 py-6 rounded-lg shadow-2xl max-w-2xl text-center border border-red-500">
                        <h3 className="font-bold text-xl mb-2 text-red-100">Application Error</h3>
                        <p className="text-sm text-red-200 font-mono bg-black/30 p-2 rounded mb-4">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-500 transition-colors">Reload Page</button>
                    </div>
                </div>
            )}
            <SearchBar onSelectCallback={handleLocationSelect} />
            <AuthButton />
            {selectedLocation && (
                <>
                    <WeightControls
                        weights={weights}
                        onChange={setWeights}
                        opacity={opacity}
                        onOpacityChange={setOpacity}
                        radius={radius}
                        onRadiusChange={setRadius}
                        enabled={enabled}
                        onToggle={toggleEnabled}
                    />
                    <RadiusStats stats={radiusStats} onClose={() => setRadiusStats(null)} />
                </>
            )}
            <div className="absolute bottom-6 left-6 z-10 pointer-events-none hidden sm:block">
                <h1 className="text-2xl font-bold text-white drop-shadow-md">Investment Heatmap</h1>
                <p className="text-sm text-slate-300 drop-shadow-md">USA Demographic Analysis</p>
            </div>
            <div className="absolute top-0 right-0 m-4 pl-80 p-2 text-xs text-slate-500 pointer-events-none hidden lg:block">Zoom: {zoom}</div>
        </div>
    );
}
