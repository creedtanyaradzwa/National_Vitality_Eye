import React, { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { ChartBarIcon, TableCellsIcon, SparklesIcon } from '@heroicons/react/24/outline';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F97316'];
const SELECTED_COLOR = '#a855f7';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-modern px-4 py-3 border border-white/10 rounded-xl">
                <p className="text-white font-bold tracking-tight mb-1 text-sm">{label || payload[0]?.payload?.name}</p>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0]?.payload?.color || '#8B5CF6' }} />
                    <p className="text-gray-400 text-xs font-mono">
                        Cases: <span className="text-white font-bold">{payload[0]?.value?.toLocaleString()}</span>
                    </p>
                </div>
                {payload[0]?.payload?.percentage !== undefined && (
                    <p className="text-gray-500 text-xs mt-1">
                        Share: <span className="text-purple-400 font-bold">{payload[0].payload.percentage}%</span>
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const DiseaseChart = ({ data, selectedDisease, onSelectDisease, diseaseTrends }) => {
    const [chartType, setChartType] = useState('bar');

    if (!data || data.length === 0) {
        return (
            <div className="glass-card-modern p-8 text-center border border-white/5">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white tracking-tight">Disease Analytics</h2>
                </div>
                <div className="py-20">
                    <ChartBarIcon className="h-12 w-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Insufficient data for trend analysis</p>
                </div>
            </div>
        );
    }

    const totalCases = data.reduce((sum, d) => sum + d.count, 0);

    const chartData = data.slice(0, 8).map((item, index) => ({
        name: item._id,
        cases: item.count,
        color: item._id === selectedDisease ? SELECTED_COLOR : COLORS[index % COLORS.length],
        percentage: Math.round((item.count / totalCases) * 100),
        isSelected: item._id === selectedDisease
    }));

    // Trend data for selected disease (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = (diseaseTrends || []).slice(-6).map(d => ({
        label: months[(d._id?.month || 1) - 1],
        count: d.count
    }));

    return (
        <div className="glass-card-modern border border-white/5">
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-cyber-blue" />
                            Pathogen Distribution
                        </h2>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-1">
                            {totalCases.toLocaleString()} total clinical events
                            {selectedDisease && <span className="text-purple-400 ml-2">· {selectedDisease} selected</span>}
                        </p>
                    </div>

                    <div className="flex gap-2 p-1 bg-brand-dark-950/50 rounded-xl border border-white/5">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                chartType === 'bar'
                                    ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/20'
                                    : 'text-gray-500 hover:text-white'
                            }`}
                            title="Bar chart"
                        >
                            <ChartBarIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setChartType('pie')}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                                chartType === 'pie'
                                    ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/20'
                                    : 'text-gray-500 hover:text-white'
                            }`}
                            title="Pie chart"
                        >
                            <TableCellsIcon className="h-4 w-4" />
                        </button>
                        {trendData.length > 0 && (
                            <button
                                onClick={() => setChartType('trend')}
                                className={`p-2 rounded-lg transition-all duration-300 ${
                                    chartType === 'trend'
                                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/20'
                                        : 'text-gray-500 hover:text-white'
                                }`}
                                title="Trend chart"
                            >
                                <SparklesIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Click-to-select hint */}
                {chartType === 'bar' && onSelectDisease && (
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4">
                        Click a bar to focus on that disease
                    </p>
                )}

                <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'bar' ? (
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ left: 80, right: 30 }}
                            onClick={(e) => {
                                if (e?.activePayload?.[0]?.payload?.name && onSelectDisease) {
                                    onSelectDisease(e.activePayload[0].payload.name);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={100}
                                stroke="rgba(255,255,255,0.1)"
                                tick={({ x, y, payload }) => {
                                    const isSelected = payload.value === selectedDisease;
                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            dy={4}
                                            textAnchor="end"
                                            fill={isSelected ? '#a855f7' : '#6B7280'}
                                            fontSize={10}
                                            fontWeight={isSelected ? 'bold' : 'normal'}
                                        >
                                            {payload.value}
                                        </text>
                                    );
                                }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Bar dataKey="cases" radius={[0, 4, 4, 0]} barSize={18} style={{ cursor: onSelectDisease ? 'pointer' : 'default' }}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        opacity={selectedDisease && !entry.isSelected ? 0.45 : 1}
                                        stroke={entry.isSelected ? '#a855f7' : 'none'}
                                        strokeWidth={entry.isSelected ? 1.5 : 0}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : chartType === 'pie' ? (
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={4}
                                dataKey="cases"
                                stroke="none"
                                onClick={(entry) => onSelectDisease && onSelectDisease(entry.name)}
                                style={{ cursor: onSelectDisease ? 'pointer' : 'default' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        opacity={selectedDisease && !entry.isSelected ? 0.45 : 1}
                                        stroke={entry.isSelected ? '#fff' : 'none'}
                                        strokeWidth={entry.isSelected ? 2 : 0}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                formatter={(value) => (
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${value === selectedDisease ? 'text-purple-400' : 'text-gray-500'}`}>
                                        {value}
                                    </span>
                                )}
                            />
                        </PieChart>
                    ) : (
                        /* Trend chart for selected disease */
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="trendGradDash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="label" stroke="rgba(255,255,255,0.15)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <YAxis stroke="rgba(255,255,255,0.15)" fontSize={10} tick={{ fill: '#94a3b8' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#8B5CF6"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#trendGradDash)"
                                name="Cases"
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>

                {/* Disease list with percentages */}
                <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 gap-2">
                    {chartData.map((d) => (
                        <button
                            key={d.name}
                            onClick={() => onSelectDisease && onSelectDisease(d.name)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 text-left ${
                                d.isSelected
                                    ? 'bg-purple-500/15 border border-purple-500/30'
                                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                                <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${d.isSelected ? 'text-purple-300' : 'text-gray-400'}`}>
                                    {d.name}
                                </span>
                            </div>
                            <span className={`text-[10px] font-mono ml-2 flex-shrink-0 ${d.isSelected ? 'text-white' : 'text-gray-500'}`}>
                                {d.cases.toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DiseaseChart;
