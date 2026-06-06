/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

interface ChartPoint {
  label: string;
  value: number;
  rawStr: string;
}

// Custom performant hook for silky-smooth count-up / morph animation using high frame-rate requestAnimationFrame
function useAnimatedNumber(targetValue: number, duration: number = 1000) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const previousValueRef = useRef(targetValue);

  useEffect(() => {
    const startVal = previousValueRef.current;
    if (startVal === targetValue) {
      return;
    }

    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuad curve for standard premium banking acceleration/deceleration
      const easeProgress = progress * (2 - progress);
      const current = startVal + (targetValue - startVal) * easeProgress;
      setCurrentValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        previousValueRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  useEffect(() => {
    previousValueRef.current = currentValue;
  }, [currentValue]);

  return currentValue;
}

const CHART_DATA: ChartPoint[] = [
  { label: 'Mar 1', value: 160000, rawStr: '$160,000.00' },
  { label: 'Mar 8', value: 185000, rawStr: '$185,000.00' },
  { label: 'Mar 15', value: 172000, rawStr: '$172,000.00' },
  { label: 'Mar 22', value: 205000, rawStr: '$205,000.00' },
  { label: 'Mar 29', value: 198000, rawStr: '$198,000.00' },
  { label: 'Apr 5', value: 215000, rawStr: '$215,000.00' },
  { label: 'Apr 12', value: 208000, rawStr: '$208,000.00' },
  { label: 'Apr 19', value: 218000, rawStr: '$218,000.00' },
  { label: 'Apr 26', value: 212000, rawStr: '$212,000.00' },
  { label: 'May 3', value: 224000, rawStr: '$224,000.00' },
  { label: 'May 10', value: 220000, rawStr: '$220,000.00' },
  { label: 'May 17', value: 225000, rawStr: '$225,000.00' },
  { label: 'May 24', value: 227672.25, rawStr: '$227,672.25' },
];

interface FinancialChartProps {
  totalBalance?: number;
}

export default function FinancialChart({ totalBalance }: FinancialChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(CHART_DATA.length - 1);

  // Formatting helper
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const text = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(absVal);
    return isNegative ? `-${text}` : text;
  };

  const liveTotal = totalBalance !== undefined ? totalBalance : 227672.25;
  const animatedTotal = useAnimatedNumber(liveTotal, 1000);
  const originalLastValue = 227672.25;

  const scaledData = CHART_DATA.map((d, idx) => {
    if (idx === CHART_DATA.length - 1) {
      return {
        ...d,
        value: animatedTotal,
        rawStr: formatCurrency(animatedTotal),
      };
    }
    const ratio = originalLastValue > 0 ? (animatedTotal / originalLastValue) : 0;
    const val = d.value * ratio;
    return {
      ...d,
      value: val,
      rawStr: formatCurrency(val),
    };
  });

  // Layout calculations
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const values = scaledData.map(d => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 100) * 1.05;

  // Map data to SVG coordinates
  const points = scaledData.map((d, i) => {
    const x = paddingX + (i * (width - 2 * paddingX)) / (scaledData.length - 1);
    const y = height - paddingY - ((d.value - minVal) * (height - 2 * paddingY)) / (maxVal - minVal);
    return { x, y, ...d };
  });

  // Construct SVG path (smooth cubic curve)
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Path for fill area
  let areaPath = '';
  if (points.length > 0) {
    areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="w-full bg-[#0f172a] rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-visible">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Balance</span>
          <div className="text-3xl font-extrabold text-white tracking-tight mt-1 flex items-baseline">
            {activePoint.rawStr}
            <span className="text-xs text-blue-400 font-mono ml-2 font-normal">
              {activePoint.label === 'May 24' ? 'May 24' : activePoint.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-emerald-450 text-emerald-400 text-xs font-bold">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>8.6% from last month</span>
          </div>
        </div>

        {/* Selected Data Pill */}
        {activePoint && (
          <div className="bg-slate-900 border border-slate-800 text-xs px-2.5 py-1 text-slate-300 rounded-lg pointer-events-none">
            <span className="font-mono font-bold text-blue-400">{activePoint.label}</span>
            <span className="mx-1.5 text-slate-600">•</span>
            <span className="font-bold text-white">{activePoint.rawStr}</span>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative h-44 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(points.length - 1)}
        >
          <defs>
            {/* Glowing gradient stroke */}
            <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Fading area fill */}
            <linearGradient id="chartAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>

            {/* Filter glow */}
            <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Fill under the curve */}
          <path d={areaPath} fill="url(#chartAreaFill)" />

          {/* Curve stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#chartStroke)"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Render interactive dots and hitboxes */}
          {points.map((p, i) => {
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                {/* Horizontal reference dashed lines for hover state */}
                {isHovered && (
                  <>
                    <line
                      x1={p.x}
                      y1={paddingY}
                      x2={p.x}
                      y2={height - paddingY}
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.6"
                    />
                    <circle cx={p.x} cy={p.y} r="8" fill="#2563eb" opacity="0.3" />
                    <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" />
                  </>
                )}

                {/* Larger transparent hover capture circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic X Axis labels from Screen 4 */}
      <div className="flex justify-between px-6 text-[10px] font-medium text-slate-500 font-mono mt-1">
        <span>Mar 8</span>
        <span>Mar 22</span>
        <span>Apr 5</span>
        <span>Apr 19</span>
        <span>May 3</span>
        <span>May 17</span>
        <span>May 24</span>
      </div>
    </div>
  );
}
