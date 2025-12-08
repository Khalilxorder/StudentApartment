import React from 'react';

export interface SearchGoal {
    budget: { min?: number; max?: number; currency: 'HUF' | 'EUR' };
    location: {
        districts: number[];
        poi_proximity?: { target: string; max_minutes: number }[];
    };
    features: {
        must_have: string[];
        nice_to_have: string[];
    };
    occupancy: {
        type: 'student' | 'couple' | 'roommate';
        count: number;
    };
    status: 'exploring' | 'refining' | 'monitoring';
}

interface SearchGoalCardProps {
    goal: SearchGoal;
    className?: string;
}

export default function SearchGoalCard({ goal, className = '' }: SearchGoalCardProps) {
    // Helpers to format display
    const formatMoney = (amount?: number, currency = 'HUF') => {
        if (!amount) return 'Any';
        return new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    };

    const formatDistricts = (districts: number[]) => {
        if (districts.length === 0) return 'Any district';
        return `Districts ${districts.join(', ')}`;
    };

    return (
        <div className={`bg-gradient-to-b from-orange-50 to-amber-50/50 border-b border-orange-200/60 p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                    Current Search Profile
                </h3>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold shadow-sm ${goal.status === 'refining'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                    {goal.status === 'refining' ? 'Refining' : 'Ready'}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Budget */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100/80 hover:shadow-md transition-shadow">
                    <div className="text-gray-500 text-[10px] mb-1 font-medium">Budget</div>
                    <div className="font-semibold text-gray-900">
                        {goal.budget.max ? `Up to ${formatMoney(goal.budget.max)}` : 'Not set'}
                    </div>
                </div>

                {/* Location */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100/80 hover:shadow-md transition-shadow">
                    <div className="text-gray-500 text-[10px] mb-1 font-medium">Location</div>
                    <div className="font-semibold text-gray-900 truncate">
                        {formatDistricts(goal.location.districts)}
                    </div>
                </div>

                {/* Occupancy */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100/80 hover:shadow-md transition-shadow">
                    <div className="text-gray-500 text-[10px] mb-1 font-medium">Who</div>
                    <div className="font-semibold text-gray-900 capitalize">
                        {goal.occupancy.count} {goal.occupancy.type}
                    </div>
                </div>

                {/* Features */}
                <div className="bg-white p-3 rounded-lg shadow-sm border border-orange-100/80 hover:shadow-md transition-shadow flex flex-col justify-center">
                    <div className="text-gray-500 text-[10px] mb-1 font-medium">Must-haves</div>
                    {goal.features.must_have.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {goal.features.must_have.slice(0, 2).map(f => (
                                <span key={f} className="inline-block px-1.5 py-0.5 bg-orange-100 rounded text-[9px] text-orange-800 font-medium truncate max-w-[60px]">{f}</span>
                            ))}
                            {goal.features.must_have.length > 2 && <span className="text-[9px] text-gray-500 font-medium">+{goal.features.must_have.length - 2}</span>}
                        </div>
                    ) : (
                        <span className="text-gray-400 italic">None</span>
                    )}
                </div>
            </div>
        </div>
    );
}
