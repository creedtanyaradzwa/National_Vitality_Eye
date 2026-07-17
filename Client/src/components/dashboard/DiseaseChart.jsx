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
    Pie
} from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#F97316', '#6366F1', '#A855F7'];

const DiseaseChart = ({ data = [], totalCases, selectedDisease, onSelectDisease, diseaseTrends }) => {
    const [chartType, setChartType] = useState('bar');

    if (!data || data.length === 0) {
        return (
            <div className="glass-card-modern p-12 text-center border border-white/5">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">No disease data available</p>
            </div>
        );
    }

    return (
        <div className="glass-card-modern p-6 border border-white/5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-cyber-blue" />
                    Disease Distribution
                </h2>
                <div className="flex bg-brand-dark-950 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setChartType('bar')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${chartType === 'bar' ? 'bg-cyber-blue text-brand-dark-950' : 'text-gray-500 hover:text-white'}`}
                    >
                        Bar
                    </button>
                    <button
                        onClick={() => setChartType('pie')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${chartType === 'pie' ? 'bg-cyber-blue text-brand-dark-950' : 'text-gray-500 hover:text-white'}`}
                    >
                        Pie
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[300px]" style={{ minHeight: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'bar' ? (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="_id" 
                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    color: '#fff'
                                }}
                                itemStyle={{ color: '#00f2ff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <Bar 
                                dataKey="count" 
                                radius={[4, 4, 0, 0]}
                                onClick={(d) => onSelectDisease(d._id)}
                                cursor="pointer"
                            >
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry._id === selectedDisease ? '#00f2ff' : COLORS[index % COLORS.length]} 
                                        fillOpacity={entry._id === selectedDisease ? 1 : 0.6}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="count"
                                nameKey="_id"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                onClick={(d) => onSelectDisease(d._id)}
                            >
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]} 
                                        stroke="none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    fontSize: '12px'
                                }}
                            />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DiseaseChart;
