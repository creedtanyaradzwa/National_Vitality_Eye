import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { getProvinceStats, getTopDiseases, getDiseaseInsights, getDiseaseAnalytics } from '../services/api';
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
    ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

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

// Component to control map view
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
    const [diseases, setDiseases] = useState([]);
    const [diseaseInsights, setDiseaseInsights] = useState(null);
    const [diseaseAnalytics, setDiseaseAnalytics] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Load available diseases — default to highest-cases disease
    useEffect(() => {
        const loadDiseases = async () => {
            try {
                const response = await getTopDiseases();
                if (response.data && response.data.length > 0) {
                    setDiseases(['All Diseases', ...response.data.map(d => d._id)]);
                    // Default: disease with highest cases
                    setSelectedDisease(response.data[0]._id);
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
                    getDiseaseInsights(selectedDisease),
                    getDiseaseAnalytics(selectedDisease)
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
    }, [selectedDisease]);

    const loadMapData = useCallback(async () => {
        setLoading(true);
        try {
            // Pass disease filter to get province stats specific to selected disease
            const diseaseFilter = selectedDisease !== 'All Diseases' ? selectedDisease : '';
            const response = await getProvinceStats(timePeriod, diseaseFilter);

            if (response.data && Array.isArray(response.data)) {
                setProvinceStats(response.data);
                // Total cases for selected disease/period
                const total = response.data.reduce((sum, p) => sum + (p.total || 0), 0);
                setTotalCases(total);
            } else {
                setProvinceStats([]);
                setTotalCases(0);
            }
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

    const getProvinceColor = (provinceName) => {
        const province = provinceStats.find(p => p._id === provinceName);
        // Since province stats are now filtered by selected disease, total IS the disease count
        const cases = province?.total || 0;

        if (cases === 0) return '#1e293b';
        if (cases < 10) return '#06b6d4';
        if (cases < 50) return '#3b82f6';
        if (cases < 100) return '#8b5cf6';
        if (cases < 200) return '#f59e0b';
        if (cases < 500) return '#ef4444';
        return '#dc2626';
    };

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
        const provinceData = getProvinceStatsByName(provinceName);
        const displayCases = provinceData?.displayCases || 0;
        const diseases = provinceData?.diseases || [];
        
        const getSeverityMessage = (cases) => {
            if (cases === 0) return '✅ No reported cases';
            if (cases < 10) return '🟢 Low risk area';
            if (cases < 50) return '🟡 Moderate risk area';
            if (cases < 200) return '🟠 High risk area';
            return '🔴 Critical risk area';
        };

        const diseaseLabel = selectedDisease === 'All Diseases' ? 'Total Cases' : selectedDisease;

        const popupContent = `
            <div style="min-width: 220px; padding: 12px; background: #0a0a0b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff;">
                <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #a855f7; text-transform: uppercase; letter-spacing: 1px;">${provinceName}</h3>
                <p style="margin: 4px 0; color: #94a3b8;"><strong>📊 ${diseaseLabel}:</strong> ${displayCases}</p>
                <p style="margin: 4px 0; color: #94a3b8;"><strong>⚠️ Status:</strong> ${getSeverityMessage(displayCases)}</p>
                <p style="margin: 4px 0; color: #64748b; font-size: 11px;"><strong>📅 Period:</strong> ${getPeriodLabel()}</p>
                ${selectedDisease === 'All Diseases' && diseases.length > 0 ? `
                    <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <strong style="color: #a855f7; font-size: 12px; text-transform: uppercase;">🏥 Top Diseases:</strong>
                        <ul style="margin-top: 4px; padding-left: 15px; color: #94a3b8; font-size: 11px;">
                            ${diseases.slice(0, 3).map(d => `<li>${d.name}: ${d.cases}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
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
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: '30days', label: 'Last 30 Days' },
                        { key: '90days', label: 'Last 3 Months' },
                        { key: 'year', label: 'Last Year' },
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

                {/* Disease selector — prominent, defaults to highest-cases disease */}
                <div className="flex items-center gap-3 bg-white/5 border border-purple-500/30 p-2 rounded-2xl">
                    <div className="flex items-center gap-2 ml-2">
                        <BeakerIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Disease Focus:</span>
                    </div>
                    <select
                        value={selectedDisease}
                        onChange={(e) => setSelectedDisease(e.target.value)}
                        className="bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                    >
                        {diseases.map((d, i) => (
                            <option key={i} value={d}>{d}{i === 1 ? ' (highest cases)' : ''}</option>
                        ))}
                    </select>
                    {insightsLoading && (
                        <div className="w-4 h-4 border-2 border-purple-500/30 rounded-full animate-spin border-t-purple-500 mr-2"></div>
                    )}
                </div>
            </div>

            {/* Stats Cards — disease-specific */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">
                                {selectedDisease === 'All Diseases' ? 'Total Cases' : `${selectedDisease} Cases`}
                            </p>
                            <p className="text-3xl font-bold text-white">{totalCases}</p>
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
                <div className={`rounded-xl bg-gradient-to-br ${highRiskCount > 0 ? 'from-red-500/20 to-red-600/20 border-red-500/30' : 'from-green-500/20 to-emerald-500/20 border-green-500/30'} p-6`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">High Risk Provinces</p>
                            <p className={`text-3xl font-bold ${highRiskCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{highRiskCount}</p>
                            <p className="text-xs text-gray-500 mt-1">100+ cases threshold</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${highRiskCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
                            {highRiskCount > 0 ? <ExclamationTriangleIcon className="h-6 w-6 text-red-400" /> : <CheckCircleIcon className="h-6 w-6 text-green-400" />}
                        </div>
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
                            <GeoJSON 
                                data={zimbabweGeoJSON}
                                onEachFeature={onEachFeature}
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
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Growth</p>
                                    <p className={`text-lg font-black ${diseaseInsights.summary?.growthRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {diseaseInsights.summary?.growthRate > 0 ? '+' : ''}{diseaseInsights.summary?.growthRate}%
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Hotspot</p>
                                    <p className="text-sm font-black text-purple-400 uppercase">{diseaseInsights.summary?.hotspot}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Age Group</p>
                                    <p className="text-sm font-black text-white">{diseaseInsights.summary?.primaryAgeGroup}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Cases</p>
                                    <p className="text-lg font-black text-white">{diseaseAnalytics?.totalCases || '—'}</p>
                                </div>
                            </div>

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
                        <div className="p-4 text-center py-12">
                            <MapIcon className="h-14 w-14 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400 text-sm">Click on any province on the map</p>
                            <p className="text-xs text-gray-500 mt-1">to view detailed statistics</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-white mb-3 text-sm">
                    Risk Level Legend
                    {selectedDisease !== 'All Diseases' && <span className="text-purple-400 font-normal ml-2">— {selectedDisease}</span>}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MapView;