import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { getProvinceStats } from '../services/api';
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
    CalendarIcon
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

    // FIXED: Wrap loadMapData in useCallback to prevent recreation on every render
    const loadMapData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getProvinceStats(timePeriod);
            console.log('Map data loaded for period:', timePeriod, response.data);
            
            if (response.data && Array.isArray(response.data)) {
                setProvinceStats(response.data);
                const total = response.data.reduce((sum, p) => sum + (p.total || 0), 0);
                setTotalCases(total);
            } else if (response.data && response.data.provinces) {
                setProvinceStats(response.data.provinces);
                setTotalCases(response.data.totalCases || 0);
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
    }, [timePeriod]); // Only recreate when timePeriod changes

    // FIXED: useEffect with proper dependencies
    useEffect(() => {
        if (canViewAnalytics) {
            loadMapData();
        }
    }, [canViewAnalytics, refreshTrigger, timePeriod, loadMapData]);

    const getProvinceColor = (provinceName) => {
        const province = provinceStats.find(p => p._id === provinceName);
        const cases = province?.total || 0;
        
        if (cases === 0) return '#64748b';
        if (cases < 10) return '#34d399';
        if (cases < 50) return '#fbbf24';
        if (cases < 100) return '#fb923c';
        if (cases < 200) return '#f97316';
        if (cases < 500) return '#ef4444';
        return '#dc2626';
    };

    const getProvinceStatsByName = (provinceName) => {
        return provinceStats.find(p => p._id === provinceName);
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
        const totalCases = provinceData?.total || 0;
        const diseases = provinceData?.diseases || [];
        
        const getSeverityMessage = (cases) => {
            if (cases === 0) return '✅ No reported cases';
            if (cases < 10) return '🟢 Low risk area';
            if (cases < 50) return '🟡 Moderate risk area';
            if (cases < 200) return '🟠 High risk area';
            return '🔴 Critical risk area';
        };

        const popupContent = `
            <div style="min-width: 220px; padding: 12px; background: #1e293b; border-radius: 12px; color: #fff;">
                <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #a855f7;">${provinceName}</h3>
                <p style="margin: 4px 0; color: #94a3b8;"><strong>📊 Total Cases:</strong> ${totalCases}</p>
                <p style="margin: 4px 0; color: #94a3b8;"><strong>⚠️ Status:</strong> ${getSeverityMessage(totalCases)}</p>
                <p style="margin: 4px 0; color: #64748b; font-size: 11px;"><strong>📅 Period:</strong> ${getPeriodLabel()}</p>
                ${diseases.length > 0 ? `
                    <div style="margin-top: 8px;">
                        <strong style="color: #a855f7;">🏥 Top Diseases:</strong>
                        <ul style="margin-top: 4px; padding-left: 20px; color: #94a3b8;">
                            ${diseases.slice(0, 3).map(d => `<li>${d.name}: ${d.cases} cases</li>`).join('')}
                        </ul>
                    </div>
                ` : '<p style="margin-top: 8px; color: #94a3b8;">No disease data available</p>'}
            </div>
        `;
        
        layer.bindPopup(popupContent);
        layer.on('click', () => {
            setSelectedProvince({
                name: provinceName,
                data: provinceData,
                totalCases
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

            {/* Time Period Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setTimePeriod('30days')}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        timePeriod === '30days'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Last 30 Days</span>
                </button>
                <button
                    onClick={() => setTimePeriod('90days')}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        timePeriod === '90days'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Last 3 Months</span>
                </button>
                <button
                    onClick={() => setTimePeriod('year')}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        timePeriod === 'year'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Last Year</span>
                </button>
                <button
                    onClick={() => setTimePeriod('all')}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                        timePeriod === 'all'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                >
                    <CalendarIcon className="h-4 w-4" />
                    <span>All Time</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Cases</p>
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
                        <h2 className="font-semibold text-white">Interactive Disease Map</h2>
                        <p className="text-sm text-gray-400">Click on any province to see detailed statistics for {getPeriodLabel().toLowerCase()}</p>
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

                <div className="lg:col-span-1 rounded-xl bg-white/5 border border-white/10">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                        <h2 className="font-semibold text-white">Province Details</h2>
                        <p className="text-sm text-gray-400">Click a province on the map to view details</p>
                    </div>
                    
                    {selectedProvince ? (
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white">{selectedProvince.name}</h3>
                                <button onClick={() => setSelectedProvince(null)} className="text-gray-400 hover:text-white transition">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div className={`p-4 rounded-xl mb-4 ${
                                selectedProvince.totalCases >= 100 ? 'bg-red-500/20 border border-red-500/30' : 
                                selectedProvince.totalCases >= 50 ? 'bg-orange-500/20 border border-orange-500/30' : 
                                selectedProvince.totalCases > 0 ? 'bg-green-500/20 border border-green-500/30' :
                                'bg-gray-500/20 border border-gray-500/30'
                            }`}>
                                <p className="text-2xl font-bold text-white">{selectedProvince.totalCases}</p>
                                <p className="text-sm text-gray-300">Total Reported Cases ({getPeriodLabel().toLowerCase()})</p>
                            </div>
                            
                            {selectedProvince.data?.diseases && selectedProvince.data.diseases.length > 0 ? (
                                <div>
                                    <h4 className="font-semibold text-purple-400 mb-3">Disease Breakdown</h4>
                                    <div className="space-y-2">
                                        {selectedProvince.data.diseases.map((disease, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300">
                                                <span className="text-sm text-gray-300">{disease.name}</span>
                                                <span className="text-sm font-semibold text-white">{disease.cases} cases</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                                    <p>No disease data available for this period</p>
                                </div>
                            )}
                            
                            <button
                                onClick={() => zoomToProvince(selectedProvince.name)}
                                className="mt-4 w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center justify-center space-x-2"
                            >
                                <MagnifyingGlassIcon className="h-4 w-4" />
                                <span>Zoom to Province</span>
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 text-center py-12">
                            <MapIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                            <p className="text-gray-400">Click on any province on the map</p>
                            <p className="text-sm text-gray-500 mt-1">to view detailed statistics</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold text-white mb-3">Risk Level Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#64748b' }}></div><span className="text-xs text-gray-400">No Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#34d399' }}></div><span className="text-xs text-gray-400">1-9 Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div><span className="text-xs text-gray-400">10-49 Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#fb923c' }}></div><span className="text-xs text-gray-400">50-99 Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div><span className="text-xs text-gray-400">100-199 Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div><span className="text-xs text-gray-400">200-499 Cases</span></div>
                    <div className="flex items-center space-x-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div><span className="text-xs text-gray-400">500+ Cases</span></div>
                </div>
            </div>
        </div>
    );
};

export default MapView;