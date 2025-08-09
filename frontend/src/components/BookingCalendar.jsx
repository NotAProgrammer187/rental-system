import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay, isBefore, isAfter, startOfDay, isWithinInterval } from 'date-fns';

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
  const [tooltipDate, setTooltipDate] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [errorMessage, setErrorMessage] = useState('');

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Create dates at noon to avoid timezone issues
    const firstDay = new Date(year, month, 1, 12, 0, 0);
    const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
    const startDate = new Date(year, month, 1 - firstDay.getDay(), 12, 0, 0);

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

  // Check if date range contains any disabled dates
  const rangeContainsDisabledDates = (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    
    return disabledDates.some(disabledDate => {
      const disabled = new Date(disabledDate);
      return isWithinInterval(disabled, { start: startDate, end: endDate });
    });
  };

  // Get the reason why a date is disabled
  const getDisabledReason = (date) => {
    const today = startOfDay(new Date());
    
    if (isBefore(date, today)) {
      return 'Past date';
    }
    
    if (disabledDates.some(disabledDate => isSameDay(date, new Date(disabledDate)))) {
      return 'Already booked';
    }
    
    return null;
  };

  // Check if date is in selected range
  const isInSelectedRange = (date) => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return false;
    
    // If checkIn and checkOut are the same (single day), no range
    if (isSameDay(selectedDates.checkIn, selectedDates.checkOut)) return false;
    
    return isAfter(date, selectedDates.checkIn) && 
           isBefore(date, selectedDates.checkOut);
  };

  // Check if date is selected (start or end date)
  const isSelected = (date) => {
    return (selectedDates.checkIn && isSameDay(date, selectedDates.checkIn)) ||
           (selectedDates.checkOut && isSameDay(date, selectedDates.checkOut));
  };

  // Check if this is a single day selection
  const isSingleDaySelection = () => {
    return selectedDates.checkIn && selectedDates.checkOut && 
           isSameDay(selectedDates.checkIn, selectedDates.checkOut);
  };

  // Check if date is the start of range
  const isRangeStart = (date) => {
    return selectedDates.checkIn && isSameDay(date, selectedDates.checkIn) && 
           selectedDates.checkOut && !isSameDay(selectedDates.checkIn, selectedDates.checkOut);
  };

  // Check if date is the end of range
  const isRangeEnd = (date) => {
    return selectedDates.checkOut && isSameDay(date, selectedDates.checkOut) && 
           selectedDates.checkIn && !isSameDay(selectedDates.checkIn, selectedDates.checkOut);
  };

  // Handle date click - Single click behavior
  const handleDateClick = (date) => {
    if (isDateDisabled(date)) {
      setErrorMessage('This date is not available. Please select a different date.');
      return;
    }

    // Clear any existing error message
    setErrorMessage('');

    // Normalize the clicked date to avoid timezone issues
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

    // SINGLE-CLICK LOGIC:
    // 1. First click: Set both checkIn and checkOut to the same date (single day booking)
    // 2. Second click (different date): Create range with earlier date as checkIn, later as checkOut
    // 3. Any subsequent click: Reset to new single day booking

    if (!selectedDates.checkIn) {
      // No selection yet - set single day booking
      onDateSelect({ checkIn: normalizedDate, checkOut: normalizedDate });
    } else if (!selectedDates.checkOut || isSameDay(selectedDates.checkIn, selectedDates.checkOut)) {
      // Currently have single day selected - create range or reset
      if (isSameDay(normalizedDate, selectedDates.checkIn)) {
        // Clicking same date - clear selection
        onDateSelect({ checkIn: null, checkOut: null });
        return;
      }
      
      // Create range with earlier date as checkIn, later as checkOut
      const startDate = isBefore(normalizedDate, selectedDates.checkIn) ? normalizedDate : selectedDates.checkIn;
      const endDate = isBefore(normalizedDate, selectedDates.checkIn) ? selectedDates.checkIn : normalizedDate;
      
      // Validate the range
      const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (nights < minStay) {
        setErrorMessage(`Minimum stay is ${minStay} night${minStay > 1 ? 's' : ''}`);
        return;
      }
      if (nights > maxStay) {
        setErrorMessage(`Maximum stay is ${maxStay} nights`);
        return;
      }
      
      // Check if range contains disabled dates
      if (rangeContainsDisabledDates(startDate, endDate)) {
        setErrorMessage('The selected date range includes unavailable dates. Please choose different dates.');
        return;
      }
      
      onDateSelect({ checkIn: startDate, checkOut: endDate });
    } else {
      // Already have a range selected - reset to new single day booking
      onDateSelect({ checkIn: normalizedDate, checkOut: normalizedDate });
    }
  };

  // Handle date hover - Simplified for single-click interaction
  const handleDateHover = (date) => {
    if (isDateDisabled(date)) return;
    // Only set hover for preview effect, not for range selection
    setHoveredDate(date);
  };

  // Handle tooltip display
  const handleTooltipShow = (date, event) => {
    if (isDateDisabled(date)) {
      const rect = event.target.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setTooltipDate(date);
    }
  };

  const handleTooltipHide = () => {
    setTooltipDate(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event, date) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDateClick(date);
    } else if (event.key === 'Escape') {
      setErrorMessage('');
      handleTooltipHide();
    }
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
      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-bounce-in">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-700 text-sm">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
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
          type="button"
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
          const isSingleDay = isSingleDaySelection() && isSelectedDate;
          const isStartDate = isRangeStart(date);
          const isEndDate = isRangeEnd(date);
          const isHovered = hoveredDate && isSameDay(date, hoveredDate) && !isDisabled;
          const disabledReason = isDisabled ? getDisabledReason(date) : null;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              onMouseEnter={(e) => {
                handleDateHover(date);
                handleTooltipShow(date, e);
              }}
              onMouseLeave={() => {
                setHoveredDate(null);
                handleTooltipHide();
              }}
              onKeyDown={(e) => handleKeyDown(e, date)}
              disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              aria-label={
                isDisabled 
                  ? `${format(date, 'MMMM dd, yyyy')} - ${disabledReason}` 
                  : format(date, 'MMMM dd, yyyy')
              }
              aria-disabled={isDisabled}
              className={`
                relative h-12 text-sm font-medium transition-all duration-200
                ${isDisabled 
                  ? 'text-gray-400 cursor-not-allowed bg-gray-100 hover:bg-gray-100 rounded-lg' 
                  : 'cursor-pointer hover:scale-105 active:scale-95'
                }
                ${isSingleDay
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg rounded-xl border-2 border-primary-700'
                  : ''
                }
                ${isStartDate
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg rounded-l-xl border-2 border-primary-700'
                  : ''
                }
                ${isEndDate
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg rounded-r-xl border-2 border-primary-700'
                  : ''
                }
                ${isInRange
                  ? 'bg-primary-100 text-primary-700 border-y-2 border-primary-200'
                  : ''
                }
                ${isHovered && !isSelectedDate
                  ? 'bg-primary-50 text-primary-600 rounded-lg'
                  : ''
                }
                ${!isDisabled && !isSelectedDate && !isInRange && !isHovered
                  ? 'text-gray-900 hover:bg-primary-50 hover:shadow-md rounded-lg'
                  : ''
                }
              `}
            >
              {format(date, 'd')}
              
              {/* Disabled date overlay */}
              {isDisabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-8 bg-gray-400 transform rotate-45"></div>
                </div>
              )}
              
              {/* Single day indicator */}
              {isSingleDay && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                </div>
              )}
              
              {/* Range start indicator */}
              {isStartDate && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                </div>
              )}
              
              {/* Range end indicator */}
              {isEndDate && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                </div>
              )}
              
              {/* Booked indicator for disabled dates */}
              {isDisabled && disabledReason === 'Already booked' && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltipDate && (
        <div
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{getDisabledReason(tooltipDate)}</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}

      {/* Calendar Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">How to select dates:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>1st click:</strong> Select single day (check-in = check-out)</p>
            <p><strong>2nd click:</strong> Create date range (earlier date = check-in, later = check-out)</p>
            <p><strong>Any new click:</strong> Reset to new single day selection</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pt-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-600 rounded-xl border border-primary-700 shadow-sm relative">
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-primary-600 rounded-full"></div>
                </div>
              </div>
              <span>Single day</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex">
                <div className="w-3 h-4 bg-primary-600 rounded-l-lg border border-primary-700"></div>
                <div className="w-3 h-4 bg-primary-100 border-y border-primary-200"></div>
                <div className="w-3 h-4 bg-primary-600 rounded-r-lg border border-primary-700"></div>
              </div>
              <span>Date range</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-50 rounded border border-primary-200"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2 relative">
              <div className="w-4 h-4 bg-gray-100 rounded relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-gray-400 transform rotate-45"></div>
                </div>
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                </div>
              </div>
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Dates Summary */}
      {selectedDates.checkIn && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Selected Dates</h4>
            <button
              type="button"
              onClick={() => onDateSelect({ checkIn: null, checkOut: null })}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
          
          {isSingleDaySelection() ? (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 px-3 py-2 bg-primary-100 rounded-lg">
                <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-primary-800">Single Day Booking</p>
                  <p className="text-xs text-primary-600">{format(selectedDates.checkIn, 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Click another date to create a range</p>
            </div>
          ) : (
            <>
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
                    {Math.ceil((selectedDates.checkOut - selectedDates.checkIn) / (1000 * 60 * 60 * 24))} night{Math.ceil((selectedDates.checkOut - selectedDates.checkIn) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">Click any date to start a new selection</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
