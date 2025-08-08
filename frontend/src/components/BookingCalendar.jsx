import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';

const BookingCalendar = ({ 
  property, 
  onDateSelect, 
  selectedDates = { checkIn: null, checkOut: null },
  disabledDates = [],
  minStay = 1,
  maxStay = 365
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    while (currentDate <= lastDay || days.length < 42) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Check if date is disabled
  const isDateDisabled = (date) => {
    const today = startOfDay(new Date());
    
    // Past dates
    if (isBefore(date, today)) return true;
    
    // Disabled dates (bookings, blocked dates)
    return disabledDates.some(disabledDate => 
      isSameDay(date, new Date(disabledDate))
    );
  };

  // Check if date is in selected range
  const isInSelectedRange = (date) => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return false;
    
    return isAfter(date, selectedDates.checkIn) && 
           isBefore(date, selectedDates.checkOut);
  };

  // Check if date is selected
  const isSelected = (date) => {
    return (selectedDates.checkIn && isSameDay(date, selectedDates.checkIn)) ||
           (selectedDates.checkOut && isSameDay(date, selectedDates.checkOut));
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
      // Start new selection
      onDateSelect({ checkIn: date, checkOut: null });
    } else {
      // Complete selection
      if (isBefore(date, selectedDates.checkIn)) {
        onDateSelect({ checkIn: date, checkOut: selectedDates.checkIn });
      } else {
        const nights = Math.ceil((date - selectedDates.checkIn) / (1000 * 60 * 60 * 24));
        if (nights < minStay) {
          alert(`Minimum stay is ${minStay} nights`);
          return;
        }
        if (nights > maxStay) {
          alert(`Maximum stay is ${maxStay} nights`);
          return;
        }
        onDateSelect({ checkIn: selectedDates.checkIn, checkOut: date });
      }
    }
  };

  // Handle date hover
  const handleDateHover = (date) => {
    if (isDateDisabled(date)) return;
    setHoveredDate(date);
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="bg-white rounded-2xl shadow-soft p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isDisabled = isDateDisabled(date);
          const isSelectedDate = isSelected(date);
          const isInRange = isInSelectedRange(date);
          const isHovered = hoveredDate && isInSelectedRange(date) && 
                           isAfter(date, selectedDates.checkIn) && 
                           isBefore(date, hoveredDate);

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => handleDateHover(date)}
              onMouseLeave={() => setHoveredDate(null)}
              disabled={isDisabled}
              className={`
                relative h-12 rounded-lg text-sm font-medium transition-all
                ${isDisabled 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'hover:bg-primary-50 cursor-pointer'
                }
                ${isSelectedDate 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : ''
                }
                ${isInRange || isHovered
                  ? 'bg-primary-100 text-primary-700'
                  : ''
                }
                ${!isDisabled && !isSelectedDate && !isInRange && !isHovered
                  ? 'text-gray-900'
                  : ''
                }
              `}
            >
              {format(date, 'd')}
              
              {/* Check-in/Check-out indicators */}
              {isSelectedDate && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-600 rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-100 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Dates Summary */}
      {selectedDates.checkIn && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <h4 className="font-medium text-gray-900 mb-2">Selected Dates</h4>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-600">Check-in</p>
              <p className="font-medium">{format(selectedDates.checkIn, 'MMM dd, yyyy')}</p>
            </div>
            {selectedDates.checkOut && (
              <>
                <div className="flex-1 h-px bg-gray-300 mx-4"></div>
                <div>
                  <p className="text-gray-600">Check-out</p>
                  <p className="font-medium">{format(selectedDates.checkOut, 'MMM dd, yyyy')}</p>
                </div>
              </>
            )}
          </div>
          {selectedDates.checkOut && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {Math.ceil((selectedDates.checkOut - selectedDates.checkIn) / (1000 * 60 * 60 * 24))} nights
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
