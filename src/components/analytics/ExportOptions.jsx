import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

const ExportOptions = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const exportFormats = [
    { type: 'revenue', label: 'Revenue Report', formats: ['csv', 'pdf', 'excel'] },
    { type: 'bookings', label: 'Booking Report', formats: ['csv', 'pdf', 'excel'] },
    { type: 'property-performance', label: 'Property Performance', formats: ['csv', 'pdf', 'excel'] },
    { type: 'financial-summary', label: 'Financial Summary', formats: ['csv', 'pdf', 'excel'] }
  ];

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
            <h3 className="text-sm font-semibold text-gray-900">Export Reports</h3>
            <p className="text-xs text-gray-500 mt-1">Choose report type and format</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {exportFormats.map((report) => (
              <div key={report.type} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{report.label}</span>
                </div>
                <div className="flex space-x-2">
                  {report.formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(report.type, format)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                    >
                      <span className="mr-1">{formatIcons[format]}</span>
                      {formatLabels[format]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <div className="flex items-center text-xs text-gray-500">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              <span>Reports are generated server-side for optimal performance</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;

