import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

const ExportOptions = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const exportFormats = ['csv', 'pdf', 'excel'];
  const formatLabels = {
    csv: 'CSV',
    pdf: 'PDF',
    excel: 'Excel'
  };
  const formatIcons = {
    csv: '📊',
    pdf: '📄',
    excel: '📈'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExport = (type, format) => {
    onExport(type, format);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
      >
        <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
        Export
        <ChevronDownIcon className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Export Reports</h3>
            <p className="text-xs text-gray-500 mt-1">Choose report type and format</p>
          </div>
          
          <div className="py-2">
            {/* Revenue Report */}
            <div className="px-4 py-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Revenue Report</h4>
                  <p className="text-xs text-gray-500">Total revenue, bookings, and earnings</p>
                </div>
                <div className="flex space-x-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport('revenue', format)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <span className="mr-1">{formatIcons[format]}</span>
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Report */}
            <div className="px-4 py-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Booking Report</h4>
                  <p className="text-xs text-gray-500">Booking trends and occupancy data</p>
                </div>
                <div className="flex space-x-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport('booking', format)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <span className="mr-1">{formatIcons[format]}</span>
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Performance Report */}
            <div className="px-4 py-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Property Performance</h4>
                  <p className="text-xs text-gray-500">Individual property analytics</p>
                </div>
                <div className="flex space-x-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport('property-performance', format)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <span className="mr-1">{formatIcons[format]}</span>
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Summary Report */}
            <div className="px-4 py-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Financial Summary</h4>
                  <p className="text-xs text-gray-500">Complete financial breakdown</p>
                </div>
                <div className="flex space-x-2">
                  {exportFormats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport('financial-summary', format)}
                      className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <span className="mr-1">{formatIcons[format]}</span>
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;

