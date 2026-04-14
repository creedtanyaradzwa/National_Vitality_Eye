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
    Legend
} from 'recharts';
import { ChartBarIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card-modern px-4 py-2">
                <p className="text-white font-semibold">{label}</p>
                <p className="text-purple-400 text-sm">
                    Cases: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const DiseaseChart = ({ data }) => {
    const [chartType, setChartType] = useState('bar');

    if (!data || data.length === 0) {
        return (
            <div className="neon-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold gradient-text-modern">Disease Distribution</h2>
                </div>
                <p className="text-gray-400 text-center py-12">No disease data available yet</p>
            </div>
        );
    }

    const chartData = data.slice(0, 8).map((item, index) => ({
        name: item._id,
        cases: item.count,
        color: COLORS[index % COLORS.length],
        percentage: Math.round((item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100)
    }));

    const totalCases = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className="neon-card p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold gradient-text-modern">Disease Distribution</h2>
                    <p className="text-gray-400 text-sm mt-1">Based on {totalCases.toLocaleString()} total cases</p>
                </div>
                
                <div className="flex space-x-2">
                    <button
                        onClick={() => setChartType('bar')}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                            chartType === 'bar' 
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <ChartBarIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setChartType('pie')}
                        className={`p-2 rounded-lg transition-all duration-300 ${
                            chartType === 'pie' 
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <TableCellsIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
                {chartType === 'bar' ? (
                    <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.3)" />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={100} 
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fill: '#9CA3AF' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="cases" radius={[0, 8, 8, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                ) : (
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="cases"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            wrapperStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
                        />
                    </PieChart>
                )}
            </ResponsiveContainer>
            
            {/* Stats Footer */}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-gray-500">
                <span>Top 8 diseases shown</span>
                <span>Click chart to toggle view</span>
            </div>
        </div>
    );
};

export default DiseaseChart;