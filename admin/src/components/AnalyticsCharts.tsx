import React, { useState } from 'react';
import { MOCK_REVENUE_CHART } from '../mockData';

interface ChartProps {
  brandSlug?: string;
  brandColor?: string;
}

export const AnalyticsCharts: React.FC<ChartProps> = ({ brandSlug, brandColor }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Extract date labels and values
  const labels = MOCK_REVENUE_CHART.map((d) => d.date);
  
  // Decide dataset based on brand
  const dataValues = MOCK_REVENUE_CHART.map((d) => {
    if (brandSlug) {
      if (brandSlug === 'seenbanao') return d.SeenBanao;
      if (brandSlug === 'jushhpk') return d.JushhPK;
      if (brandSlug === 'dineatblue') return d.DineAtBlue;
      // Default fallback for other brands
      return Math.round(d.total * 0.15);
    }
    return d.total;
  });

  const maxVal = Math.max(...dataValues) * 1.15; // Give headroom
  const minVal = 0;

  // Chart dimensions
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  // Map values to coordinates
  const points = dataValues.map((val, idx) => {
    const x = paddingX + (idx * (width - paddingX * 2)) / (dataValues.length - 1);
    const y = height - paddingY - ((val - minVal) * (height - paddingY * 2)) / (maxVal - minVal);
    return { x, y, value: val, label: labels[idx] };
  });

  // SVG Path generation
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const primaryColor = brandColor || '#3B82F6'; // Default Blue for SuperAdmin

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-semibold text-gray-500 dark:text-slate-400">
          {brandSlug ? 'Sales Performance (PKR)' : 'Overall Revenue Stream (PKR)'}
        </h4>
        <div className="flex gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 dark:text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }}></span>
            Revenue
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={primaryColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => {
            const yVal = paddingY + (i * (height - paddingY * 2)) / 3;
            const gridVal = Math.round(maxVal - (i * maxVal) / 3);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={yVal}
                  x2={width - paddingX}
                  y2={yVal}
                  stroke="#E2E8F0"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                  className="dark:stroke-slate-700"
                />
                <text
                  x={paddingX - 8}
                  y={yVal + 4}
                  textAnchor="end"
                  fontSize={10}
                  className="fill-gray-400 dark:fill-slate-500 font-medium"
                >
                  Rs. {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line chart */}
          <path
            d={linePath}
            fill="none"
            stroke={primaryColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Horizontal date labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              className="fill-gray-400 dark:fill-slate-500 font-semibold"
            >
              {p.label}
            </text>
          ))}

          {/* Data points & hover overlays */}
          {points.map((p, idx) => (
            <g key={idx} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
              {/* Invisible touch target */}
              <circle cx={p.x} cy={p.y} r={12} fill="transparent" className="cursor-pointer" />
              
              {/* Outer ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === idx ? 6 : 4}
                fill={primaryColor}
                stroke="#FFFFFF"
                strokeWidth={hoveredIndex === idx ? 2 : 1.5}
                className="transition-all duration-200 dark:stroke-slate-900"
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs pointer-events-none transition-all duration-150 z-20"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold text-[10px] text-slate-400 mb-0.5">{points[hoveredIndex].label}</div>
            <div className="font-bold">Rs. {points[hoveredIndex].value.toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
};
