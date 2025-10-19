'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
}

interface ChartRendererProps {
  chartData: ChartData;
}

const COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Deep Orange
  '#a855f7', // Violet
];

export default function ChartRenderer({ chartData }: ChartRendererProps) {
  const { type, title, data, xKey = 'name', yKey = 'value' } = chartData;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey={yKey} radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <defs>
                <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={yKey} 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, fill: '#ec4899' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0.7}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={{
                  stroke: '#6b7280',
                  strokeWidth: 1
                }}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={130}
                innerRadius={60}
                paddingAngle={2}
                dataKey={yKey}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <defs>
                <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey={xKey} stroke="#6b7280" />
              <PolarRadiusAxis stroke="#6b7280" />
              <Radar 
                name="Value" 
                dataKey={yKey} 
                stroke="#ec4899" 
                fill="url(#colorRadar)" 
                fillOpacity={0.6}
                strokeWidth={2}
                dot={{ fill: '#ec4899', r: 4 }}
              />
              <Legend />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-red-500">Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {title && <h3 className="text-xl font-bold mb-6 text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{title}</h3>}
      {renderChart()}
    </div>
  );
}
