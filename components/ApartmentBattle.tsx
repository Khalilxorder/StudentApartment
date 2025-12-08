'use client';

import { useState } from 'react';
import {
    DndContext,
    useDraggable,
    useDroppable,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent,
    DragStartEvent
} from '@dnd-kit/core';
import { BattleCard } from './BattleCard';
import { Trophy, ArrowRightLeft, Swords } from 'lucide-react';

interface ApartmentBattleProps {
    initialApartments: any[];
}

function DraggableApartment({ apartment, isOverlay = false }: { apartment: any; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: apartment.id,
        data: { apartment },
    });

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                className="opacity-50 grayscale scale-95 transition-all"
            >
                <BattleCard apartment={apartment} />
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="cursor-move hover:scale-105 transition-transform touch-none"
        >
            <BattleCard apartment={apartment} />
        </div>
    );
}

function DroppableSlot({
    id,
    apartment,
    onRemove,
    isOver
}: {
    id: string;
    apartment: any;
    onRemove: () => void;
    isOver: boolean;
}) {
    const { setNodeRef } = useDroppable({
        id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`relative rounded-2xl border-4 min-h-[400px] flex flex-col items-center justify-center p-4 transition-all ${isOver ? 'border-orange-500 bg-orange-50 scale-[1.02]' :
                apartment ? 'border-transparent bg-white shadow-xl' : 'border-dashed border-gray-300 bg-gray-50'
                }`}
        >
            {apartment ? (
                <div className="w-full h-full">
                    <BattleCard apartment={apartment} onRemove={onRemove} className="h-full" />
                </div>
            ) : (
                <div className="text-center text-gray-400">
                    <p className="font-medium text-lg mb-2">Drop Apartment Here</p>
                    <div className="w-16 h-16 rounded-full bg-gray-200 mx-auto flex items-center justify-center">
                        <span className="text-2xl">+</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ApartmentBattle({ initialApartments }: ApartmentBattleProps) {
    const [leftId, setLeftId] = useState<string | null>(null);
    const [rightId, setRightId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [winnerId, setWinnerId] = useState<string | null>(null);

    const leftApartment = initialApartments.find(a => a.id === leftId);
    const rightApartment = initialApartments.find(a => a.id === rightId);

    // Available apartments are those not legally in a slot (or if we want to allow dragging from slot to slot, we handle that)
    // For simplicity: unique apartments on bench are those NOT in left or right
    const benchApartments = initialApartments.filter(a => a.id !== leftId && a.id !== rightId);

    // For DragOverlay
    const activeApartment = initialApartments.find(a => a.id === activeId);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setWinnerId(null); // Reset winner on new interaction
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { over, active } = event;
        setActiveId(null);

        if (over) {
            const apartmentId = active.id as string;

            if (over.id === 'slot-left') {
                // If swapping sides
                if (rightId === apartmentId) setRightId(null);
                setLeftId(apartmentId);
            } else if (over.id === 'slot-right') {
                // If swapping sides
                if (leftId === apartmentId) setLeftId(null);
                setRightId(apartmentId);
            }
        }
    };

    const handleBattle = (id: string) => {
        setWinnerId(id);
        // You could trigger confetti or save preference here
    };

    const ComparisonRow = ({ label, leftVal, rightVal, format }: any) => {
        if (!leftVal || !rightVal) return null;

        // Simple logic for coloring (lower price is better, higher size is better)
        let leftBetter = false;
        let rightBetter = false;

        if (label.includes('Price')) {
            leftBetter = leftVal < rightVal;
            rightBetter = rightVal < leftVal;
        } else {
            leftBetter = leftVal > rightVal;
            rightBetter = rightVal > leftVal;
        }

        const formatVal = (v: any) => format ? format(v) : v;

        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-100 last:border-0 items-center">
                <div className={`text-right font-medium ${leftBetter ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatVal(leftVal)}
                </div>
                <div className="text-center text-xs text-gray-400 font-medium uppercase tracking-wider px-2">
                    {label}
                </div>
                <div className={`text-left font-medium ${rightBetter ? 'text-green-600' : 'text-gray-600'}`}>
                    {formatVal(rightVal)}
                </div>
            </div>
        );
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-12">
                {/* Battle Arena */}
                <div className="relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                        <div className="bg-white rounded-full p-4 shadow-xl border-4 border-orange-100">
                            <Swords className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                        {/* Left Slot */}
                        <div className={`transition-all duration-500 ${winnerId && winnerId !== leftId ? 'opacity-50 grayscale blur-sm' : ''} ${winnerId === leftId ? 'scale-105 ring-4 ring-green-400 rounded-2xl' : ''}`}>
                            <DroppableSlot
                                id="slot-left"
                                apartment={leftApartment}
                                onRemove={() => setLeftId(null)}
                                isOver={false} // TODO: Add isOver state tracking if needed for visual feedback
                            />
                            {leftApartment && rightApartment && !winnerId && (
                                <button
                                    onClick={() => handleBattle(leftApartment.id)}
                                    className="w-full mt-4 bg-white border-2 border-orange-500 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trophy size={18} />
                                    Vote Winner
                                </button>
                            )}
                            {winnerId === leftId && (
                                <div className="mt-4 bg-green-100 text-green-800 text-center py-3 rounded-xl font-bold">
                                    🏆 WINNER
                                </div>
                            )}
                        </div>

                        {/* Right Slot */}
                        <div className={`transition-all duration-500 ${winnerId && winnerId !== rightId ? 'opacity-50 grayscale blur-sm' : ''} ${winnerId === rightId ? 'scale-105 ring-4 ring-green-400 rounded-2xl' : ''}`}>
                            <DroppableSlot
                                id="slot-right"
                                apartment={rightApartment}
                                onRemove={() => setRightId(null)}
                                isOver={false}
                            />
                            {leftApartment && rightApartment && !winnerId && (
                                <button
                                    onClick={() => handleBattle(rightApartment.id)}
                                    className="w-full mt-4 bg-white border-2 border-orange-500 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trophy size={18} />
                                    Vote Winner
                                </button>
                            )}
                            {winnerId === rightId && (
                                <div className="mt-4 bg-green-100 text-green-800 text-center py-3 rounded-xl font-bold">
                                    🏆 WINNER
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Comparison */}
                {leftApartment && rightApartment && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-center font-bold text-gray-900 mb-6 flex items-center justify-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-gray-500" />
                            Direct Comparison
                        </h3>
                        <ComparisonRow
                            label="Price"
                            leftVal={leftApartment.price_huf}
                            rightVal={rightApartment.price_huf}
                            format={(v: number) => v.toLocaleString() + ' Ft'}
                        />
                        <ComparisonRow
                            label="Size"
                            leftVal={leftApartment.size_sqm}
                            rightVal={rightApartment.size_sqm}
                            format={(v: number) => v + ' m²'}
                        />
                        <ComparisonRow
                            label="Bedrooms"
                            leftVal={leftApartment.bedrooms}
                            rightVal={rightApartment.bedrooms}
                        />
                        <ComparisonRow
                            label="Bathrooms"
                            leftVal={leftApartment.bathrooms}
                            rightVal={rightApartment.bathrooms}
                        />
                        <ComparisonRow
                            label="District"
                            leftVal={leftApartment.district}
                            rightVal={rightApartment.district}
                        />
                    </div>
                )}

                {/* The Bench */}
                <div className="border-t pt-8">
                    <h3 className="text-gray-500 font-medium mb-4 uppercase tracking-wider text-sm pl-1">Available Apartments</h3>
                    {benchApartments.length === 0 && (
                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                            No more apartments to compare.
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {benchApartments.map(apt => (
                            <DraggableApartment key={apt.id} apartment={apt} />
                        ))}
                    </div>
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeApartment ? <BattleCard apartment={activeApartment} className="cursor-grabbing shadow-2xl scale-105" /> : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}
