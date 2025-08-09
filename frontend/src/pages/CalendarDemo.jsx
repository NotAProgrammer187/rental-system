import React, { useState } from 'react';
import BookingCalendar from '../components/BookingCalendar';
import { addDays, format } from 'date-fns';

const CalendarDemo = () => {
  const [selectedDates, setSelectedDates] = useState({
    checkIn: null,
    checkOut: null
  });

  // Generate some sample disabled dates for demonstration
  const generateSampleDisabledDates = () => {
    const today = new Date();
    const disabledDates = [];
    
    // Add some random booked dates in the current month
    disabledDates.push(addDays(today, 3)); // 3 days from now
    disabledDates.push(addDays(today, 4)); // 4 days from now
    disabledDates.push(addDays(today, 10)); // 10 days from now
    disabledDates.push(addDays(today, 15)); // 15 days from now
    disabledDates.push(addDays(today, 16)); // 16 days from now
    disabledDates.push(addDays(today, 17)); // 17 days from now
    disabledDates.push(addDays(today, 25)); // 25 days from now
    
    return disabledDates.map(date => date.toISOString());
  };

  const disabledDates = generateSampleDisabledDates();

  const handleDateSelect = ({ checkIn, checkOut }) => {
    setSelectedDates({ checkIn, checkOut });
  };

  const sampleProperty = {
    _id: 'demo-property',
    title: 'Demo Property',
    location: 'Demo Location'
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Single-Click Booking Calendar Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the intuitive single-click date selection! No dragging required - just click once for single day bookings, 
            click a second date to create a range. Try it out with the disabled dates and enhanced visual feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Interactive Calendar</h2>
            <BookingCalendar
              property={sampleProperty}
              selectedDates={selectedDates}
              disabledDates={disabledDates}
              onDateSelect={handleDateSelect}
              minStay={2}
              maxStay={14}
            />
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Single-Click Features</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>One-Click Selection:</strong> First click selects a single day (check-in = check-out)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Smart Range Creation:</strong> Second click automatically creates range (earlier → later date)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Easy Reset:</strong> Any new click resets to a fresh single day selection</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Visual Distinction:</strong> Single days and ranges have different styling</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Clear Feedback:</strong> Instructions and status updates guide user interaction</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p><strong>Disabled Date Protection:</strong> Prevents selection of unavailable dates</p>
                </div>
              </div>
            </div>

            {/* Current Selection */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Selection</h3>
              {selectedDates.checkIn || selectedDates.checkOut ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="font-medium">
                      {selectedDates.checkIn ? format(selectedDates.checkIn, 'MMM dd, yyyy') : 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="font-medium">
                      {selectedDates.checkOut ? format(selectedDates.checkOut, 'MMM dd, yyyy') : 'Not selected'}
                    </span>
                  </div>
                  {selectedDates.checkIn && selectedDates.checkOut && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">
                            {Math.ceil((selectedDates.checkOut - selectedDates.checkIn) / (1000 * 60 * 60 * 24))} nights
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDates({ checkIn: null, checkOut: null })}
                        className="w-full mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Clear Selection
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No dates selected yet. Click on the calendar to start selecting dates.</p>
              )}
            </div>

            {/* Sample Disabled Dates */}
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Disabled Dates</h3>
              <div className="space-y-1 text-sm text-gray-600">
                {disabledDates.slice(0, 5).map((date, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{format(new Date(date), 'MMM dd, yyyy')}</span>
                    <span className="text-red-500">Already booked</span>
                  </div>
                ))}
                {disabledDates.length > 5 && (
                  <p className="text-gray-400 italic">... and {disabledDates.length - 5} more dates</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This demo showcases the enhanced booking calendar with disabled date functionality.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalendarDemo;
