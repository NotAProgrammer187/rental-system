import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import BookingCalendar from '../components/BookingCalendar';
import { useToast } from '../context/ToastContext';

const AvailabilityCalendar = () => {
  const { showToast } = useToast();
  const [rentalId, setRentalId] = useState('');
  const [paidDates, setPaidDates] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [selected, setSelected] = useState({ checkIn: null, checkOut: null });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('month');

  const disabledDates = useMemo(() => Array.from(new Set([...(paidDates || []), ...(blockedDates || [])])), [paidDates, blockedDates]);

  const loadData = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const [paidRes, blockedRes] = await Promise.all([
        api.get(`/bookings/rental/${id}/paid-dates`),
        api.get(`/host/rental/${id}/blocked-dates`)
      ]);
      setPaidDates(paidRes.data?.dates || []);
      setBlockedDates(blockedRes.data?.blockedDates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (date) => {
    const d = new Date(date);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const key = `${y}-${m}-${dd}`;
    if (paidDates.includes(key)) return; // cannot toggle paid dates
    setBlockedDates((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const onCalendarSelect = ({ checkIn, checkOut }) => {
    // Single-day click toggles, range marks range as blocked
    if (!checkIn || !checkOut) return;
    if (checkIn.toDateString() === checkOut.toDateString()) {
      toggleDate(checkIn);
    } else {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const cursor = new Date(start);
      while (cursor <= end) {
        toggleDate(cursor);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    setSelected({ checkIn: null, checkOut: null });
  };

  const save = async () => {
    if (!rentalId) return;
    await api.put(`/host/rental/${rentalId}/blocked-dates`, { dates: blockedDates });
    showToast({ type: 'success', message: 'Availability updated' });
    await loadData(rentalId);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Availability Calendar</h1>
        <div className="flex items-center gap-2">
          <select value={view} onChange={(e) => setView(e.target.value)} className="input-field w-auto">
            <option value="month">Month</option>
            <option value="week">Week</option>
          </select>
          <button onClick={save} className="btn-primary">Save</button>
        </div>
      </div>

      <div className="flex gap-2">
        <input value={rentalId} onChange={(e) => setRentalId(e.target.value)} placeholder="Rental ID" className="input-field" />
        <button onClick={() => loadData(rentalId)} className="btn-secondary">Load</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft p-4">
          <BookingCalendar
            property={null}
            onDateSelect={onCalendarSelect}
            selectedDates={selected}
            disabledDates={disabledDates}
          />
          <div className="mt-4 text-sm text-gray-600 flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Booked (paid)</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Blocked</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-primary-200 inline-block" /> Selected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;


