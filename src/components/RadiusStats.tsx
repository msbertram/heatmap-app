'use client';

import React from 'react';

export interface RadiusData {
    avgIncome: number;
    avgHomeValue: number;
    avgRenterRate: number;
    popTotal: number;
    avgEducation: number;
    avgEmployment: number;
    avgPoverty: number;
}

interface RadiusStatsProps {
    stats: {
        r1: RadiusData | null;
        r3: RadiusData | null;
        r5: RadiusData | null;
    } | null;
    onClose: () => void;
}

export default function RadiusStats({ stats, onClose }: RadiusStatsProps) {
    if (!stats) return null;

    const fmtCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    const fmtNum = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
    const fmtPct = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(val);

    const renderColumn = (label: string, data: RadiusData | null) => {
        if (!data || data.popTotal === 0) return (
            <div className="flex flex-col items-center">
                <span className="text-slate-500 font-mono text-xs mb-1">{label}</span>
                <span className="text-slate-600 font-bold text-sm">-</span>
            </div>
        );

        return (
            <div className="flex flex-col gap-2 min-w-[80px]">
                <div className="text-center border-b border-slate-700 pb-1 mb-1">
                    <span className="text-blue-400 font-bold font-mono text-sm">{label}</span>
                </div>

                <div className="grid grid-cols-1 gap-y-2 text-xs">
                    <div className="flex flex-col">
                        <span className="text-slate-500 scale-90 origin-left">Population</span>
                        <span className="font-semibold text-slate-200">{fmtNum(data.popTotal)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 scale-90 origin-left">Avg Income</span>
                        <span className="font-semibold text-green-400">{fmtCurrency(data.avgIncome)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 scale-90 origin-left">Avg Home</span>
                        <span className="font-semibold text-blue-300">{fmtCurrency(data.avgHomeValue)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 scale-90 origin-left">Degree+</span>
                        <span className="font-semibold text-purple-300">{fmtPct(data.avgEducation)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 scale-90 origin-left">Poverty</span>
                        <span className="font-semibold text-red-400">{fmtPct(data.avgPoverty)}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="absolute top-20 left-6 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-4 animate-in fade-in slide-in-from-left-4 duration-300 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location Analysis
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex gap-6">
                {renderColumn('1 Mile', stats.r1)}
                {renderColumn('3 Miles', stats.r3)}
                {renderColumn('5 Miles', stats.r5)}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                *Estimated averages based on tract centroids within radius.
            </div>
        </div>
    );
}
