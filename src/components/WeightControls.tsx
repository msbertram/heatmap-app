'use client';

import React from 'react';

export interface Weights {
    income: number;
    population: number;
    homeValue: number;
    renterRate: number;
    educationRate: number;
    employmentRate: number;
    povertyRate: number;
}

interface WeightControlsProps {
    weights: Weights;
    onChange: (newWeights: Weights) => void;
    opacity: number;
    onOpacityChange: (val: number) => void;
    radius: number;
    onRadiusChange: (val: number) => void;
    enabled: Record<keyof Weights, boolean>;
    onToggle: (key: keyof Weights) => void;
}

export default function WeightControls({
    weights, onChange,
    opacity, onOpacityChange,
    radius, onRadiusChange,
    enabled, onToggle
}: WeightControlsProps) {

    const handleChange = (key: keyof Weights, value: string) => {
        onChange({
            ...weights,
            [key]: parseInt(value)
        });
    };

    const renderSlider = (label: string, key: keyof Weights, min = -5, max = 5) => {
        const isEnabled = enabled[key];
        const val = weights[key];
        const multiplier = (1 + val * 0.1).toFixed(1);

        return (
            <div className={`mb-4 transition-opacity duration-200 ${isEnabled ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => onToggle(key)}
                            className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500/50"
                        />
                        <label
                            className="text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer"
                            onClick={() => onToggle(key)}
                        >
                            {label}
                        </label>
                    </div>
                    {isEnabled && (
                        <span className={`text-xs font-mono font-bold ${val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            ×{multiplier}
                        </span>
                    )}
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={val}
                    disabled={!isEnabled}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-all ${isEnabled ? 'bg-slate-700 accent-blue-500 hover:accent-blue-400' : 'bg-slate-800 accent-slate-600'}`}
                />
            </div>
        );
    };

    return (
        <div className="absolute top-4 right-4 z-10 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl p-5 animate-in fade-in slide-in-from-right-2 duration-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-white mb-4 border-b border-slate-700 pb-2 flex justify-between items-center">
                <span>Criteria</span>
                <span className="text-[10px] uppercase text-slate-500 font-normal">Include?</span>
            </h2>

            {/* Scoring Radius */}
            <div className="mb-4 bg-slate-800/50 p-3 rounded-md">
                <div className="flex justify-between mb-2">
                    <label className="text-xs font-medium text-blue-300 uppercase tracking-wider">Scoring Radius</label>
                    <span className="text-xs font-mono font-bold text-blue-400">{radius} mi</span>
                </div>
                <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={radius}
                    onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <div className="flex justify-between mt-1 text-[9px] text-slate-500">
                    <span>5mi</span>
                    <span>100mi</span>
                </div>
            </div>

            {renderSlider('Household Income', 'income')}
            {renderSlider('Population Density', 'population')}
            {renderSlider('Property Value', 'homeValue')}

            <div className="my-2 border-t border-slate-800" />

            {renderSlider('Education (Bach+)', 'educationRate')}
            {renderSlider('Employment Rate', 'employmentRate')}
            {renderSlider('Poverty Rate', 'povertyRate')}

            <div className="my-2 border-t border-slate-800" />

            {renderSlider('Renter Occupied %', 'renterRate')}

            {/* Opacity Control */}
            <div className="mb-2 pt-4 border-t border-slate-700">
                <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-blue-300 uppercase tracking-wider">Map Opacity</label>
                    <span className="text-xs font-mono font-bold text-slate-400">{(opacity * 100).toFixed(0)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-slate-300 transition-all"
                />
            </div>

            <div className="mt-4 pt-2 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                    Uncheck criteria to exclude them from calculations.
                </p>
            </div>
        </div>
    );
}
