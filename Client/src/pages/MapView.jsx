import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { getProvinceStats, getAllDiseases, getDiseaseInsights, getDiseaseAnalytics } from '../services/api';
import { useAuth } from '../context/useAuth';
import { useDataRefresh } from '../context/useDataRefresh';
import L from 'leaflet';
import { 
    MapIcon, 
    ChartBarIcon, 
    ArrowPathIcon, 
    MagnifyingGlassIcon, 
    XMarkIcon, 
    ExclamationTriangleIcon, 
    CheckCircleIcon,
    CalendarIcon,
    SparklesIcon,
    BeakerIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    FireIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    buildChartSeriesWithProjections,
    resolvePrimaryHotspots,
    toGrowthIndex,
    clampPercent,
    TOP_DISEASE_LIMIT,
    MONTH_LABELS,
    PROJECTION_HORIZON
} from '../utils/analyticsHelpers';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Complete Zimbabwe provinces GeoJSON
const zimbabweGeoJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": { "name": "Harare" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[30.8, -17.6], [31.2, -17.6], [31.3, -18.0], [30.9, -18.1], [30.8, -17.6]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Bulawayo" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[28.4, -20.0], [28.8, -20.0], [28.9, -20.3], [28.4, -20.3], [28.4, -20.0]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Manicaland" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[32.0, -18.5], [32.8, -18.5], [33.0, -19.5], [32.0, -19.5], [32.0, -18.5]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Mashonaland Central" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[30.5, -16.5], [31.5, -16.5], [31.8, -17.2], [30.5, -17.2], [30.5, -16.5]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Mashonaland East" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[31.0, -17.5], [32.0, -17.5], [32.2, -18.5], [31.0, -18.5], [31.0, -17.5]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Mashonaland West" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[29.0, -16.0], [30.5, -16.0], [30.8, -17.2], [29.0, -17.2], [29.0, -16.0]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Masvingo" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[30.0, -20.0], [31.5, -20.0], [31.8, -21.0], [30.0, -21.0], [30.0, -20.0]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Matabeleland North" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[26.0, -18.0], [28.0, -18.0], [28.5, -19.5], [26.0, -19.5], [26.0, -18.0]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Matabeleland South" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[28.5, -20.5], [29.8, -20.5], [30.0, -22.0], [28.5, -22.0], [28.5, -20.5]]]
            }
        },
        {
            "type": "Feature",
            "properties": { "name": "Midlands" },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[29.0, -19.0], [30.5, -19.0], [30.8, -20.0], [29.0, -20.0], [29.0, -19.0]]]
            }
        }
    ]
};

/** Re-styles province polygons when stats or view mode change */
const MapProvinceLayer = ({ geoData, getProvinceColor, onEachFeature, layerKey }) => {
    const layerRef = useRef(null);

    useEffect(() => {
        const group = layerRef.current;
        if (!group) return;
        group.eachLayer((layer) => {
            const name = layer.feature?.properties?.name;
            if (!name) return;
            layer.setStyle({
                fillColor: getProvinceColor(name),
                weight: 1.5,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.72,
                dashArray: '3'
            });
        });
    }, [getProvinceColor, layerKey]);

    return (
        <GeoJSON
            ref={layerRef}
            key={layerKey}
            data={geoData}
            onEachFeature={onEachFeature}
        />
    );
};

const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const MapView = () => {
    const { hasPermission } = useAuth();
    const { refreshTrigger } = useDataRefresh();
    const canViewAnalytics = hasPermission('view:analytics');
    
    const [provinceStats, setProvinceStats] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([-19.0, 29.5]);
    const [mapZoom, setMapZoom] = useState(6);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [timePeriod, setTimePeriod] = useState('all');
    const [totalCases, setTotalCases] = useState(0);
    const [selectedDisease, setSelectedDisease] = useState('All Diseases');
    const [viewMode, setViewMode] = useState('cases'); // 'cases', 'growth', 'risk'
    const [diseases, setDiseases] = useState([]);
    const [diseaseInsights, setDiseaseInsights] = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics] = useState(null);
    const [mapSummary, setMapSummary] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Load all diseases for the filter
    useEffect(() => {
        const loadDiseases = async () => {
            try {
                const response = await getAllDiseases();
                if (response.data && response.data.length > 0) {
                    const diseaseNames = response.data.map(d => d._id);
                    setDiseases(diseaseNames);
                    
                    // Only set default if one isn't already selected
                    if (!selectedDisease || selectedDisease === 'All Diseases') {
                        // Find most common disease to focus on initially
                        const sortedByCount = [...response.data].sort((a, b) => b.count - a.count);
                        setSelectedDisease(sortedByCount[0]._id);
                    }
                }
            } catch (error) {
                console.error('Failed to load diseases:', error);
            }
        };
        loadDiseases();
    }, []);

    // Load disease-specific insights whenever selected disease changes
    useEffect(() => {
        const loadDiseaseInsights = async () => {
            if (!selectedDisease || selectedDisease === 'All Diseases') {
                setDiseaseInsights(null);
                setDiseaseAnalytics(null);
                return;
            }
            setInsightsLoading(true);
            try {
                const [insightsRes, analyticsRes] = await Promise.all([
                    getDiseaseInsights(selectedDisease, timePeriod),
                    getDiseaseAnalytics(selectedDisease, timePeriod)
                ]);
                setDiseaseInsights(insightsRes.data);
                setDiseaseAnalytics(analyticsRes.data);
            } catch (err) {
                console.error('Failed to load disease insights', err);
            } finally {
                setInsightsLoading(false);
            }
        };
        loadDiseaseInsights();
    }, [selectedDisease, timePeriod]);

    const mapHotspot = useMemo(() => {
        if (mapSummary?.hotspot) {
            return {
                label: mapSummary.hotspot,
                cases: mapSummary.hotspotCases,
                tied: (mapSummary.primaryHotspots?.length || 0) > 1,
                provinces: mapSummary.primaryHotspots?.map((h) => h.province) || []
            };
        }
        if (diseaseInsights?.summary?.hotspot) {
            const tied = (diseaseInsights.summary.primaryHotspots?.length || 0) > 1;
            return {
                label: diseaseInsights.summary.hotspot,
                cases: diseaseInsights.summary.hotspotCases,
                tied,
                provinces: diseaseInsights.summary.primaryHotspots?.map((h) => h.province) || []
            };
        }
        if (diseaseAnalytics?.hotspot) {
            return {
                label: diseaseAnalytics.hotspot,
                cases: diseaseAnalytics.hotspotCases,
                tied: (diseaseAnalytics.primaryHotspots?.length || 0) > 1,
                provinces: diseaseAnalytics.primaryHotspots?.map((h) => h.province) || []
            };
        }
        const pb = diseaseAnalytics?.provinceBreakdown || [];
        const info = resolvePrimaryHotspots(pb);
        return info.label
            ? { label: info.label, cases: info.maxCount, tied: info.hotspots.length > 1, provinces: info.hotspots.map((h) => h.province) }
            : null;
    }, [mapSummary, diseaseInsights, diseaseAnalytics]);

    const outbreakIndex = useMemo(() => {
        if (mapSummary?.aggregatedGrowthIndex != null) return mapSummary.aggregatedGrowthIndex;
        if (diseaseInsights?.summary?.growthIndex != null) return diseaseInsights.summary.growthIndex;
        if (diseaseAnalytics?.growthIndex != null) return diseaseAnalytics.growthIndex;
        if (diseaseAnalytics?.growthRate != null) return toGrowthIndex(diseaseAnalytics.growthRate);
        return null;
    }, [mapSummary, diseaseInsights, diseaseAnalytics]);

    const mapLayerKey = useMemo(
        () => `${viewMode}-${timePeriod}-${selectedDisease}-${provinceStats.map((p) => `${p._id}:${p.total}:${p.growthRate}`).join('|')}`,
        [viewMode, timePeriod, selectedDisease, provinceStats]
    );

    const maxProvinceCases = useMemo(
        () => Math.max(...provinceStats.map((p) => p.total || 0), 1),
        [provinceStats]
    );

    const mapTrendChartData = useMemo(() => {
        if (!diseaseAnalytics?.monthlyTrend?.length) return [];
        return buildChartSeriesWithProjections(
            diseaseAnalytics.monthlyTrend,
            6,
            diseaseAnalytics.projections,
            PROJECTION_HORIZON,
            MONTH_LABELS
        );
    }, [diseaseAnalytics]);

    const topProvinces = useMemo(
        () => [...provinceStats].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, TOP_DISEASE_LIMIT),
        [provinceStats]
    );

    const loadMapData = useCallback(async () => {
        setLoading(true);
        try {
            // Pass disease filter to get province stats specific to selected disease
            const diseaseFilter = selectedDisease !== 'All Diseases' ? selectedDisease : '';
            const response = await getProvinceStats(timePeriod, diseaseFilter);
            const provinces = response.data?.provinces || [];
            const summary = response.data?.summary || null;

            setProvinceStats(provinces);
            setMapSummary(summary);
            const provinceSum = provinces.reduce((sum, p) => sum + (p.total || 0), 0);
            setTotalCases(summary?.totalCases ?? provinceSum);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to load map data:', error);
            toast.error('Failed to load map data');
        } finally {
            setLoading(false);
        }
    }, [timePeriod, selectedDisease]);

    useEffect(() => {
        if (canViewAnalytics) {
            loadMapData();
        }
    }, [canViewAnalytics, refreshTrigger, timePeriod, selectedDisease, loadMapData]);

    const getProvinceColor = useCallback((provinceName) => {
        const province = provinceStats.find((p) => p._id === provinceName);
        if (!province) return '#1e293b';

        if (viewMode === 'growth') {
            const growth = province.growthRate ?? 50;
            if (growth < 35) return '#06b6d4';
            if (growth < 50) return '#3b82f6';
            if (growth < 65) return '#f59e0b';
            return '#dc2626';
        }

        if (viewMode === 'risk') {
            const risk = province.riskLevel;
            if (risk === 'CRITICAL') return '#dc2626';
            if (risk === 'HIGH') return '#f59e0b';
            if (risk === 'MODERATE') return '#8b5cf6';
            return '#1e293b';
        }

        const cases = province.total || 0;
        if (cases === 0) return '#1e293b';
        const ratio = cases / maxProvinceCases;
        if (ratio < 0.08) return '#06b6d4';
        if (ratio < 0.2) return '#3b82f6';
        if (ratio < 0.4) return '#8b5cf6';
        if (ratio < 0.65) return '#f59e0b';
        if (ratio < 0.85) return '#ef4444';
        return '#dc2626';
    }, [provinceStats, viewMode, maxProvinceCases]);

    const getProvinceStatsByName = (provinceName) => {
        const province = provinceStats.find(p => p._id === provinceName);
        return {
            ...province,
            displayCases: province?.total || 0
        };
    };

    const getPeriodLabel = () => {
        switch(timePeriod) {
            case '30days': return 'Last 30 Days';
            case '90days': return 'Last 3 Months';
            case 'year': return 'Last Year';
            default: return 'All Time';
        }
    };

    const onEachFeature = (feature, layer) => {
        const provinceName = feature.properties.name;
        const provinceData = provinceStats.find(p => p._id === provinceName);
        const displayCases = provinceData?.total || 0;
        const topDisease = provinceData?.topDisease;
        const growth = provinceData?.growthRate ?? 50;
        const projectedGrowth = provinceData?.projectedGrowth ?? 50;
        const projectedCount = provinceData?.projectedCount || 0;
        
        const getSeverityMessage = (cases, growthRate, projGrowth) => {
            if (growthRate > 25 || projGrowth > 20) return '🚨 RAPID OUTBREAK DETECTED';
            if (cases === 0) return '✅ No reported cases';
            if (cases < 50) return '🟢 Low risk area';
            if (cases < 200) return '🟡 Moderate risk area';
            return '🔴 High risk area';
        };

        const diseaseLabel = selectedDisease === 'All Diseases' ? 'Overall Load' : selectedDisease;

        const popupContent = `
            <div style="min-width: 240px; padding: 14px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; color: #fff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="font-weight: 800; font-size: 16px; margin: 0; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">${provinceName}</h3>
                    <div style="text-align: right;">
                        <span style="background: ${growth > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}; color: ${growth > 0 ? '#f87171' : '#4ade80'}; padding: 2px 8px; border-radius: 8px; font-size: 10px; font-weight: 900; display: block;">
                            Index ${growth}/100
                        </span>
                        <span style="color: #a855f7; font-size: 9px; font-weight: 800; text-transform: uppercase; margin-top: 2px; display: block;">
                            Forecast index ${projectedGrowth}/100
                        </span>
                    </div>
                </div>
                
                <div style="space-y: 6px;">
                    <p style="margin: 4px 0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between;">
                        <span>📊 ${diseaseLabel}:</span>
                        <span style="color: #fff; font-weight: 700;">${displayCases} cases</span>
                    </p>
                    <p style="margin: 4px 0; color: #a855f7; font-size: 11px; display: flex; justify-content: space-between;">
                        <span>🔮 30-Day Forecast:</span>
                        <span style="font-weight: 800;">${projectedCount} cases</span>
                    </p>
                    <p style="margin: 8px 0 4px 0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between;">
                        <span>📈 Status:</span>
                        <span style="color: ${growth > 25 || projectedGrowth > 20 ? '#f87171' : '#fff'}; font-weight: 700;">${getSeverityMessage(displayCases, growth, projectedGrowth)}</span>
                    </p>
                </div>

                ${topDisease ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="margin: 0; color: #a855f7; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Top Disease Hazard</p>
                        <p style="margin: 4px 0 0 0; color: #fff; font-size: 13px; font-weight: 700;">${topDisease.name}</p>
                        <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">${topDisease.cases} active cases in this region</p>
                    </div>
                ` : ''}

                <div style="margin-top: 12px; text-align: center;">
                    <p style="margin: 0; color: #64748b; font-size: 10px; font-style: italic;">Click province for deep AI analytics</p>
                </div>
            </div>
        `;
        
        layer.bindPopup(popupContent);
        layer.on('click', () => {
            setSelectedProvince({
                name: provinceName,
                data: provinceData,
                totalCases: displayCases
            });
        });

        layer.setStyle({
            fillColor: getProvinceColor(provinceName),
            weight: 1.5,
            opacity: 1,
            color: '#ffffff',
            fillOpacity: 0.7,
            dashArray: '3'
        });

        layer.on('mouseover', function() {
            this.setStyle({
                weight: 3,
                color: '#a855f7',
                fillOpacity: 0.85
            });
        });
        
        layer.on('mouseout', function() {
            this.setStyle({
                weight: 1.5,
                color: '#ffffff',
                fillOpacity: 0.7
            });
        });
    };

    const zoomToProvince = (provinceName) => {
        const province = zimbabweGeoJSON.features.find(f => f.properties.name === provinceName);
        if (province) {
            const coords = province.geometry.coordinates[0];
            const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
            const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            
            setMapCenter([centerLat, centerLng]);
            setMapZoom(8);
            toast.success(`Zooming to ${provinceName}`);
        }
    };

    const highRiskCount = provinceStats.filter(p => (p.total || 0) >= 100).length;

    if (!canViewAnalytics) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 p-[1px]">
                    <div className="rounded-2xl bg-slate-900/90 backdrop-blur-xl p-12 text-center">
                        <MapIcon className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
                        <p className="text-gray-400">You don't have permission to view the disease map.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-500/20 rounded-full animate-spin border-t-purple-500"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <MapIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-[1px] mb-8">
                <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl p-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                                <MapIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Zimbabwe Disease Distribution Map</h1>
                                <p className="text-gray-400">Real-time disease prevalence across Zimbabwe's provinces</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-gray-500">Last updated</p>
                                <p className="text-sm text-gray-300">{lastUpdated.toLocaleTimeString()}</p>
                            </div>
                            <button onClick={loadMapData} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300">
                                <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Period + Disease Selector */}
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: '30days', label: 'Last 30 Days' },
                            { key: '90days', label: 'Last 3 Months' },
                            { key: 'all', label: 'All Time' }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTimePeriod(key)}
                                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 text-sm ${
                                    timePeriod === key
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                                }`}
                            >
                                <CalendarIcon className="h-4 w-4" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 border border-purple-500/30 p-2 rounded-2xl">
                        <div className="flex items-center gap-2 ml-2">
                            <BeakerIcon className="h-4 w-4 text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Disease Filter:</span>
                        </div>
                        <select
                            value={selectedDisease}
                            onChange={(e) => setSelectedDisease(e.target.value)}
                            className="bg-brand-dark-900 text-white text-xs font-bold py-2 px-3 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                        >
                            <option value="All Diseases">All Diseases</option>
                            {diseases
                                .filter(d => d !== 'All Diseases')
                                .sort((a, b) => a.localeCompare(b))
                                .map((d, i) => (
                                <option key={i} value={d}>{d}</option>
                            ))}
                        </select>
                        {insightsLoading && (
                            <div className="w-4 h-4 border-2 border-purple-500/30 rounded-full animate-spin border-t-purple-500 mr-2"></div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-cyan-400" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Analytical Overlay:</span>
                        </div>
                        <div className="flex gap-2">
                            {[
                                { key: 'cases', label: 'Case Intensity', icon: ChartBarIcon },
                                { key: 'growth', label: 'Outbreak Velocity', icon: ArrowTrendingUpIcon },
                                { key: 'risk', label: 'Risk Profile', icon: ExclamationTriangleIcon }
                            ].map((mode) => (
                                <button
                                    key={mode.key}
                                    onClick={() => setViewMode(mode.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 border ${
                                        viewMode === mode.key
                                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                            : 'text-gray-500 border-transparent hover:text-gray-300'
                                    }`}
                                >
                                    <mode.icon className="h-3.5 w-3.5" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                            AI Confidence: {diseaseInsights?.aiConfidence != null ? `${diseaseInsights.aiConfidence.toFixed(0)}%` : '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">
                                {selectedDisease === 'All Diseases' ? 'Total Clinical Events' : `${selectedDisease} Clinical Events`}
                            </p>
                            <p className="text-3xl font-bold text-white">{totalCases.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <ChartBarIcon className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Provinces with Data</p>
                            <p className="text-3xl font-bold text-white">{provinceStats.length}</p>
                            <p className="text-xs text-gray-500 mt-1">Out of 10 provinces</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <MapIcon className="h-6 w-6 text-blue-400" />
                        </div>
                    </div>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${
                    diseaseAnalytics?.growthRate > 0
                        ? 'from-red-500/20 to-red-600/20 border-red-500/30'
                        : diseaseAnalytics?.growthRate < 0
                        ? 'from-green-500/20 to-emerald-500/20 border-green-500/30'
                        : 'from-gray-500/20 to-gray-600/20 border-gray-500/30'
                } p-6`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">
                                {selectedDisease !== 'All Diseases' ? 'Outbreak Index' : 'National Outbreak Index'}
                            </p>
                            <p className={`text-3xl font-bold ${
                                (outbreakIndex ?? 50) >= 60 ? 'text-red-400'
                                : (outbreakIndex ?? 50) < 45 ? 'text-green-400'
                                : 'text-amber-300'
                            }`}>
                                {outbreakIndex != null ? (
                                    <>{outbreakIndex}<span className="text-lg text-gray-400 font-semibold">/100</span></>
                                ) : '—'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">50 = stable · higher = accelerating burden</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${
                            (outbreakIndex ?? 50) >= 60 ? 'bg-red-500/20'
                            : (outbreakIndex ?? 50) < 45 ? 'bg-green-500/20'
                            : 'bg-amber-500/20'
                        } flex items-center justify-center`}>
                            {(outbreakIndex ?? 50) >= 55
                                ? <ArrowTrendingUpIcon className="h-6 w-6 text-red-400" />
                                : (outbreakIndex ?? 50) < 45
                                ? <ArrowTrendingDownIcon className="h-6 w-6 text-green-400" />
                                : <ChartBarIcon className="h-6 w-6 text-amber-400" />}
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-gray-400 text-sm">Primary Hotspot{mapHotspot?.tied ? 's' : ''}</p>
                            {mapHotspot?.tied && mapHotspot.provinces?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {mapHotspot.provinces.map((p) => (
                                        <span key={p} className="px-2 py-0.5 rounded-md bg-violet-500/25 border border-violet-400/40 text-[10px] font-bold text-violet-200 uppercase">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-lg font-bold text-purple-300 uppercase truncate">
                                    {mapHotspot?.label || (selectedDisease === 'All Diseases' ? 'Select disease' : '—')}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                {mapHotspot?.cases != null ? `${mapHotspot.cases} cases${mapHotspot.tied ? ' each (tied)' : ''}` : 'Peak burden provinces'}
                            </p>
                        </div>
                        <MapIcon className="h-6 w-6 text-violet-400 flex-shrink-0" />
                    </div>
                </div>
            </div>

            {/* Map and Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h2 className="font-semibold text-white">
                            Interactive Disease Map
                            {selectedDisease !== 'All Diseases' && (
                                <span className="ml-2 text-sm font-normal text-purple-400">— {selectedDisease}</span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-400">
                            Click on any province to see detailed statistics for {getPeriodLabel().toLowerCase()}
                            {selectedDisease !== 'All Diseases' && ` · Showing ${selectedDisease} cases only`}
                        </p>
                    </div>
                    <div style={{ height: '500px', width: '100%' }}>
                        <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <MapProvinceLayer
                                geoData={zimbabweGeoJSON}
                                getProvinceColor={getProvinceColor}
                                onEachFeature={onEachFeature}
                                layerKey={mapLayerKey}
                            />
                            <MapController center={mapCenter} zoom={mapZoom} />
                        </MapContainer>
                    </div>
                </div>

                <div className="lg:col-span-1 rounded-xl bg-white/5 border border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h2 className="font-semibold text-white">
                            {selectedProvince ? selectedProvince.name : 'Disease Insights'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedProvince
                                ? `${selectedDisease === 'All Diseases' ? 'All diseases' : selectedDisease} · ${getPeriodLabel()}`
                                : selectedDisease !== 'All Diseases' ? `AI analysis for ${selectedDisease}` : 'Select a disease or click a province'}
                        </p>
                    </div>

                    {selectedProvince ? (
                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`flex-1 p-4 rounded-xl ${
                                    selectedProvince.totalCases >= 100 ? 'bg-red-500/20 border border-red-500/30' :
                                    selectedProvince.totalCases >= 50 ? 'bg-orange-500/20 border border-orange-500/30' :
                                    selectedProvince.totalCases > 0 ? 'bg-green-500/20 border border-green-500/30' :
                                    'bg-gray-500/20 border border-gray-500/30'
                                }`}>
                                    <p className="text-2xl font-bold text-white">{selectedProvince.totalCases}</p>
                                    <p className="text-xs text-gray-300">
                                        {selectedDisease === 'All Diseases' ? 'Total cases' : `${selectedDisease} cases`} · {getPeriodLabel()}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedProvince(null)} className="ml-3 text-gray-400 hover:text-white transition p-1">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            {selectedProvince.data?.diseases && selectedProvince.data.diseases.length > 0 && selectedDisease === 'All Diseases' ? (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Disease Breakdown</h4>
                                    <div className="space-y-1.5">
                                        {selectedProvince.data.diseases
                                            .sort((a, b) => b.cases - a.cases)
                                            .slice(0, TOP_DISEASE_LIMIT)
                                            .map((disease, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200">
                                                <span className="text-xs text-gray-300">{disease.name}</span>
                                                <span className="text-xs font-bold text-white">{disease.cases}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedDisease !== 'All Diseases' ? (
                                <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-1">{selectedDisease}</p>
                                    <p className="text-xl font-black text-white">{selectedProvince.totalCases} cases</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{getPeriodLabel()}</p>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <ChartBarIcon className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                                    <p className="text-sm">No data for this period</p>
                                </div>
                            )}

                            <button
                                onClick={() => zoomToProvince(selectedProvince.name)}
                                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <MagnifyingGlassIcon className="h-4 w-4" />
                                <span>Zoom to Province</span>
                            </button>
                        </div>
                    ) : diseaseInsights && selectedDisease !== 'All Diseases' ? (
                        /* AI Disease Insights Panel */
                        <div className="p-4 flex-1 overflow-y-auto space-y-4">
                            <div className={`p-3 rounded-xl border text-center ${
                                diseaseInsights.summary?.riskLevel === 'CRITICAL' ? 'bg-red-500/20 border-red-500/30' :
                                diseaseInsights.summary?.riskLevel === 'HIGH' ? 'bg-orange-500/20 border-orange-500/30' :
                                'bg-blue-500/20 border-blue-500/30'
                            }`}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Risk Level</p>
                                <p className={`text-xl font-black ${
                                    diseaseInsights.summary?.riskLevel === 'CRITICAL' ? 'text-red-400' :
                                    diseaseInsights.summary?.riskLevel === 'HIGH' ? 'text-orange-400' : 'text-blue-400'
                                }`}>{diseaseInsights.summary?.riskLevel}</p>
                                <p className="text-[10px] text-gray-500 mt-1">AI Confidence: {diseaseInsights.aiConfidence?.toFixed(0)}%</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Outbreak Index</p>
                                    <p className="text-lg font-black text-amber-300">
                                        {outbreakIndex ?? '—'}<span className="text-sm text-gray-500">/100</span>
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Hotspot{mapHotspot?.tied ? 's' : ''}</p>
                                    {mapHotspot?.tied && mapHotspot.provinces?.length ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {mapHotspot.provinces.map((p) => (
                                                <span key={p} className="text-[10px] font-bold text-violet-200 uppercase px-1.5 py-0.5 rounded bg-violet-500/20">{p}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-black text-purple-400 uppercase">{mapHotspot?.label || 'N/A'}</p>
                                    )}
                                    {mapHotspot?.cases != null && (
                                        <p className="text-[10px] text-amber-400/90 mt-1">{mapHotspot.cases} cases each</p>
                                    )}
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Target Demographic</p>
                                    <p className="text-sm font-black text-white">{diseaseInsights.summary?.primaryAgeGroup}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Clinical Events</p>
                                    <p className="text-lg font-black text-white">
                                        {(mapSummary?.totalCases ?? diseaseAnalytics?.totalCases ?? 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {mapTrendChartData.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                                    <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Case trend & 3-month forecast</p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <AreaChart data={mapTrendChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} width={32} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                                            <Area type="monotone" dataKey="actual" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} name="Actual" connectNulls={false} />
                                            <Line type="monotone" dataKey="projected" stroke="#F59E0B" strokeDasharray="4 3" strokeWidth={2} name="Forecast" connectNulls dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {diseaseInsights.recommendations?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">AI Recommendations</p>
                                    <div className="space-y-2">
                                        {diseaseInsights.recommendations.slice(0, 3).map((rec, idx) => (
                                            <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                                <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-1">{rec.title}</p>
                                                <p className="text-[10px] text-gray-400 leading-relaxed">{rec.action}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-600 text-center">Click a province on the map for location-specific data</p>
                        </div>
                    ) : (
                        <div className="p-4 flex-1 overflow-y-auto space-y-6">
                            {/* Neural Outbreak Card */}
                            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 p-5">
                                <div className="absolute top-0 right-0 p-2">
                                    <SparklesIcon className="h-4 w-4 text-cyan-400 animate-pulse" />
                                </div>
                                <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">Neural Outbreak Prediction</h3>
                                
                                {provinceStats.some(p => (p.growthRate ?? 0) >= 65) ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <FireIcon className="h-8 w-8 text-orange-500" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Emerging Hotspots</p>
                                                <p className="text-[10px] text-gray-400">Rapid growth detected in {provinceStats.filter(p => p.growthRate > 20).length} regions</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {provinceStats.filter(p => (p.growthRate ?? 0) >= 65).slice(0, 3).map(p => (
                                                <div key={p._id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <span className="text-xs text-gray-300 font-medium">{p._id}</span>
                                                    <span className="text-xs font-black text-red-400">{p.growthRate}/100</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                        <div>
                                            <p className="text-sm font-bold text-white">Stable Trajectory</p>
                                            <p className="text-[10px] text-gray-400">No rapid outbreaks predicted for the current window.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Top Regional Hazard */}
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Top {TOP_DISEASE_LIMIT} Regional Hazards</h3>
                                <div className="space-y-2">
                                    {topProvinces.map(p => (
                                        <div key={p._id} className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{p._id}</p>
                                                    <p className="text-sm font-bold text-white truncate w-32">{p.topDisease?.name || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-purple-400">{p.total} cases</p>
                                                    <p className="text-[8px] text-gray-600">Risk: {p.riskLevel}</p>
                                                </div>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full bg-gradient-to-r ${
                                                        p.riskLevel === 'CRITICAL' ? 'from-red-500 to-red-600' :
                                                        p.riskLevel === 'HIGH' ? 'from-orange-500 to-yellow-500' :
                                                        'from-blue-500 to-cyan-500'
                                                    }`}
                                                    style={{ width: `${Math.min((p.total / (totalCases || 1)) * 300, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                                <MapIcon className="h-10 w-10 mx-auto mb-3 text-gray-700" />
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Neural processing complete. Click on a province to unlock localized intervention strategies.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                    {viewMode === 'cases' ? <ChartBarIcon className="h-4 w-4 text-purple-400" /> :
                     viewMode === 'growth' ? <ArrowTrendingUpIcon className="h-4 w-4 text-cyan-400" /> :
                     <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />}
                    {viewMode === 'cases' ? 'Case Intensity Legend' :
                     viewMode === 'growth' ? 'Outbreak Velocity Legend' :
                     'Risk Profile Legend'}
                    {selectedDisease !== 'All Diseases' && <span className="text-gray-500 font-normal ml-2">— {selectedDisease}</span>}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {viewMode === 'cases' ? (
                        [
                            { color: '#1e293b', label: 'No Cases' },
                            { color: '#06b6d4', label: '1-9 Cases' },
                            { color: '#3b82f6', label: '10-49 Cases' },
                            { color: '#8b5cf6', label: '50-99 Cases' },
                            { color: '#f59e0b', label: '100-199 Cases' },
                            { color: '#ef4444', label: '200-499 Cases' },
                            { color: '#dc2626', label: '500+ Cases' }
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: color }}></div>
                                <span className="text-xs text-gray-400">{label}</span>
                            </div>
                        ))
                    ) : viewMode === 'growth' ? (
                        [
                            { color: '#06b6d4', label: 'Stable trajectory' },
                            { color: '#3b82f6', label: 'Low velocity' },
                            { color: '#f59e0b', label: 'Moderate acceleration' },
                            { color: '#dc2626', label: 'Rapid outbreak risk' }
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: color }}></div>
                                <span className="text-xs text-gray-400">{label}</span>
                            </div>
                        ))
                    ) : (
                        [
                            { color: '#3b82f6', label: 'Moderate Risk' },
                            { color: '#f59e0b', label: 'High Risk' },
                            { color: '#dc2626', label: 'Critical Risk (Forecasted)' }
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center space-x-2">
                                <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: color }}></div>
                                <span className="text-xs text-gray-400">{label}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapView;