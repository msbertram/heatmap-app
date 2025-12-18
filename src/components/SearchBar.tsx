'use client';

import React, { useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useAddressHistory } from '@/lib/hooks/useAddressHistory';
import AuthModal from './auth/AuthModal';

interface SearchResult {
    id: string;
    place_name: string;
    center: [number, number];
}

interface SearchBarProps {
    onSelectCallback: (center: [number, number]) => void;
}

export default function SearchBar({ onSelectCallback }: SearchBarProps) {
    const { user } = useAuth();
    const { history, addToHistory } = useAddressHistory(user);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleSearch = async (text: string) => {
        setQuery(text);
        if (text.length < 3) {
            setResults([]);
            return;
        }

        try {
            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&country=us&autocomplete=true&limit=5`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.features) {
                setResults(data.features);
            }
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

    const handleSelect = (center: [number, number], placeName: string, address: string) => {
        onSelectCallback(center);
        setQuery(placeName);
        setIsFocused(false);

        // Save to history if authenticated
        if (user) {
            addToHistory({
                address: address,
                place_name: placeName,
                longitude: center[0],
                latitude: center[1],
            });
        }
    };

    return (
        <div className="absolute top-4 left-4 z-10 w-80 font-sans">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                    type="text"
                    readOnly={!user}
                    className={`block w-full pl-10 pr-3 py-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${!user ? 'cursor-pointer' : ''}`}
                    placeholder={user ? "Search US address or city..." : "Sign in to search locations"}
                    value={query}
                    onChange={(e) => user && handleSearch(e.target.value)}
                    onClick={() => !user && setShowAuthModal(true)}
                    onFocus={() => user && setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)} // delay to allow click
                />
            </div>

            {isFocused && (user ? (history.length > 0 || results.length > 0) : results.length > 0) && (
                <div className="absolute mt-2 w-full bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul>
                        {/* Recent searches (only for authenticated users with no query) */}
                        {user && query.length < 3 && history.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50">
                                    Recent Searches
                                </div>
                                {history.map((item) => (
                                    <li
                                        key={item.id}
                                        className="px-4 py-3 hover:bg-slate-800/80 cursor-pointer text-sm text-slate-300 border-b border-slate-800/50 transition-colors flex items-center gap-2"
                                        onClick={() => handleSelect([item.longitude, item.latitude], item.place_name, item.address)}
                                    >
                                        <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                        <span className="truncate">{item.place_name}</span>
                                    </li>
                                ))}
                            </>
                        )}

                        {/* Live search results */}
                        {results.length > 0 && (
                            <>
                                {user && query.length >= 3 && history.length > 0 && (
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50">
                                        Search Results
                                    </div>
                                )}
                                {results.map((feature) => (
                                    <li
                                        key={feature.id}
                                        className="px-4 py-3 hover:bg-slate-800/80 cursor-pointer text-sm text-slate-300 border-b border-slate-800/50 last:border-0 transition-colors"
                                        onClick={() => handleSelect(feature.center, feature.place_name, feature.place_name.split(',')[0])}
                                    >
                                        {feature.place_name}
                                    </li>
                                ))}
                            </>
                        )}
                    </ul>
                </div>
            )}

            {/* Auth modal for unauthenticated users */}
            {!user && showAuthModal && (
                <AuthModal onClose={() => setShowAuthModal(false)} />
            )}
        </div>
    );
}
