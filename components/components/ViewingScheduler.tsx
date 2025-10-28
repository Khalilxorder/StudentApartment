'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface ViewingSlot {
  id: string;
  apartment_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  notes?: string;
}

export function ViewingScheduler({
  apartmentId,
  onSlotCreated,
}: {
  apartmentId: string;
  onSlotCreated?: (slot: ViewingSlot) => void;
}) {
  const [slots, setSlots] = useState<ViewingSlot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    capacity: 3,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const startDateTime = new Date(
        `${formData.date}T${formData.startTime}`
      ).toISOString();
      const endDateTime = new Date(
        `${formData.date}T${formData.endTime}`
      ).toISOString();

      if (new Date(startDateTime) >= new Date(endDateTime)) {
        throw new Error('End time must be after start time');
      }

      const response = await fetch('/api/viewings/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartmentId,
          startTime: startDateTime,
          endTime: endDateTime,
          capacity: formData.capacity,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create slot');
      }

      const data = (await response.json()) as { slot: ViewingSlot };
      setSlots([...slots, data.slot]);
      onSlotCreated?.(data.slot);
      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        capacity: 3,
        notes: '',
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  const getOccupancy = (booked: number, capacity: number) => {
    const percent = (booked / capacity) * 100;
    if (percent >= 100) return 'Full';
    if (percent >= 75) return 'Almost full';
    if (percent >= 50) return 'Half full';
    return 'Available';
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
      >
        <Calendar size={20} />
        {showForm ? 'Cancel' : 'Create Viewing Slot'}
      </button>

      {showForm && (
        <form
          onSubmit={handleCreateSlot}
          className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional info for students..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
          >
            {loading ? 'Creating...' : 'Create Slot'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No viewing slots scheduled yet
          </p>
        ) : (
          slots.map((slot) => (
            <div
              key={slot.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">
                    {new Date(slot.start_time).toLocaleDateString()} at{' '}
                    {new Date(slot.start_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Duration: {Math.round((new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / (1000 * 60))}{' '}
                    minutes
                  </p>
                  {slot.notes && (
                    <p className="text-sm text-gray-600 mt-1">{slot.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium">
                    {slot.booked_count}/{slot.capacity}
                  </div>
                  <p className="text-xs text-gray-600">
                    {getOccupancy(slot.booked_count, slot.capacity)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
