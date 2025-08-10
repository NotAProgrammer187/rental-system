const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const User = require('../models/User');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

// Guard: must be authenticated
router.use(auth);

// Helper function to get date range
const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case '6m':
      start.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setMonth(now.getMonth() - 1); // Default to last month
  }
  
  return { start, end: now };
};

// GET /api/analytics/property-performance
router.get('/property-performance', async (req, res) => {
  try {
    const { period = '30d', propertyId } = req.query;
    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    
    // Build match conditions
    const matchConditions = {
      checkIn: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'active', 'completed'] }
    };
    
    if (propertyId) {
      matchConditions.property = mongoose.Types.ObjectId(propertyId);
    }
    
    // For hosts, only show their properties
    if (req.user.role === 'host') {
      matchConditions.host = userId;
    }
    
    const performance = await Booking.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'rentals',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyDetails'
        }
      },
      { $unwind: '$propertyDetails' },
      {
        $group: {
          _id: '$property',
          propertyTitle: { $first: '$propertyDetails.title' },
          propertyLocation: { $first: '$propertyDetails.location.formattedAddress' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageNightlyRate: { $avg: '$pricing.basePrice' },
          totalNights: { $sum: { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60 * 24] } },
          averageBookingLength: { $avg: { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60 * 24] } }
        }
      },
      {
        $addFields: {
          occupancyRate: {
            $multiply: [
              { $divide: ['$totalNights', 30] }, // Assuming 30 days per month
              100
            ]
          },
          averageRevenuePerNight: {
            $divide: ['$totalRevenue', '$totalNights']
          }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);
    
    res.json({ performance, period, dateRange: { start, end } });
  } catch (error) {
    console.error('Property performance analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/revenue-summary
router.get('/revenue-summary', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    
    const matchConditions = {
      checkIn: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'active', 'completed'] }
    };
    
    if (req.user.role === 'host') {
      matchConditions.host = userId;
    }
    
    const revenueData = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalNights: { $sum: { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60 * 24] } }
        }
      }
    ]);
    
    // Get previous period for comparison
    const previousStart = new Date(start);
    const previousEnd = new Date(end);
    const periodLength = end.getTime() - start.getTime();
    previousStart.setTime(previousStart.getTime() - periodLength);
    previousEnd.setTime(previousEnd.getTime() - periodLength);
    
    const previousMatchConditions = {
      checkIn: { $gte: previousStart, $lte: previousEnd },
      status: { $in: ['confirmed', 'active', 'completed'] }
    };
    
    if (req.user.role === 'host') {
      previousMatchConditions.host = userId;
    }
    
    const previousRevenueData = await Booking.aggregate([
      { $match: previousMatchConditions },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    const currentRevenue = revenueData[0]?.totalRevenue || 0;
    const previousRevenue = previousRevenueData[0]?.totalRevenue || 0;
    const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    res.json({
      currentPeriod: {
        totalRevenue: currentRevenue,
        totalBookings: revenueData[0]?.totalBookings || 0,
        averageBookingValue: revenueData[0]?.averageBookingValue || 0,
        totalNights: revenueData[0]?.totalNights || 0
      },
      previousPeriod: {
        totalRevenue: previousRevenue
      },
      growthRate,
      period,
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('Revenue summary analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/booking-trends
router.get('/booking-trends', async (req, res) => {
  try {
    const { period = '90d', groupBy = 'day' } = req.query;
    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    
    const matchConditions = {
      checkIn: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'active', 'completed'] }
    };
    
    if (req.user.role === 'host') {
      matchConditions.host = userId;
    }
    
    let dateGrouping;
    switch (groupBy) {
      case 'hour':
        dateGrouping = { hour: { $hour: '$checkIn' }, day: { $dayOfMonth: '$checkIn' }, month: { $month: '$checkIn' }, year: { $year: '$checkIn' } };
        break;
      case 'day':
        dateGrouping = { day: { $dayOfMonth: '$checkIn' }, month: { $month: '$checkIn' }, year: { $year: '$checkIn' } };
        break;
      case 'week':
        dateGrouping = { week: { $week: '$checkIn' }, year: { $year: '$checkIn' } };
        break;
      case 'month':
        dateGrouping = { month: { $month: '$checkIn' }, year: { $year: '$checkIn' } };
        break;
      default:
        dateGrouping = { day: { $dayOfMonth: '$checkIn' }, month: { $month: '$checkIn' }, year: { $year: '$checkIn' } };
    }
    
    const trends = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: dateGrouping,
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
          averageLeadTime: { $avg: { $divide: [{ $subtract: ['$checkIn', '$createdAt'] }, 1000 * 60 * 60 * 24] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1, '_id.hour': 1 } }
    ]);
    
    // Calculate average booking length
    const avgBookingLength = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          averageLength: { $avg: { $divide: [{ $subtract: ['$checkOut', '$checkIn'] }, 1000 * 60 * 60 * 24] } }
        }
      }
    ]);
    
    res.json({
      trends,
      averageBookingLength: avgBookingLength[0]?.averageLength || 0,
      groupBy,
      period,
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('Booking trends analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/user-behavior
router.get('/user-behavior', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Most viewed properties (based on bookings as proxy)
    const topProperties = await Booking.aggregate([
      { $match: { checkIn: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'rentals',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyDetails'
        }
      },
      { $unwind: '$propertyDetails' },
      {
        $group: {
          _id: '$property',
          propertyTitle: { $first: '$propertyDetails.title' },
          location: { $first: '$propertyDetails.location.formattedAddress' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 }
    ]);
    
    // Repeat guest analysis
    const repeatGuests = await Booking.aggregate([
      { $match: { checkIn: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$guest',
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: '$pricing.totalAmount' }
        }
      },
      { $match: { totalBookings: { $gt: 1 } } },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 }
    ]);
    
    // Guest search patterns (based on booking data)
    const searchPatterns = await Booking.aggregate([
      { $match: { checkIn: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: 'rentals',
          localField: 'property',
          foreignField: '_id',
          as: 'propertyDetails'
        }
      },
      { $unwind: '$propertyDetails' },
      {
        $group: {
          _id: {
            city: '$propertyDetails.location.city',
            state: '$propertyDetails.location.state',
            propertyType: '$propertyDetails.type'
          },
          bookings: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { bookings: -1 } }
    ]);
    
    res.json({
      topProperties,
      repeatGuests,
      searchPatterns,
      period,
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('User behavior analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/financial-summary
router.get('/financial-summary', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { start, end } = getDateRange(period);
    const userId = req.user._id;
    
    const matchConditions = {
      checkIn: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'active', 'completed'] }
    };
    
    if (req.user.role === 'host') {
      matchConditions.host = userId;
    }
    
    const financialData = await Booking.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: '$pricing.totalAmount' },
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalCleaningFees: { $sum: '$pricing.cleaningFee' },
          totalServiceFees: { $sum: '$pricing.serviceFee' },
          totalTaxes: { $sum: '$pricing.taxes' }
        }
      }
    ]);
    
    // Calculate net revenue (assuming 10% platform fee)
    const grossRevenue = financialData[0]?.grossRevenue || 0;
    const platformFee = grossRevenue * 0.10; // 10% platform fee
    const netRevenue = grossRevenue - platformFee;
    
    // Get pending payouts
    const pendingPayouts = await Booking.aggregate([
      { $match: { ...matchConditions, 'payment.status': 'paid' } },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    
    res.json({
      grossRevenue,
      netRevenue,
      platformFee,
      totalBookings: financialData[0]?.totalBookings || 0,
      averageBookingValue: financialData[0]?.averageBookingValue || 0,
      totalCleaningFees: financialData[0]?.totalCleaningFees || 0,
      totalServiceFees: financialData[0]?.totalServiceFees || 0,
      totalTaxes: financialData[0]?.totalTaxes || 0,
      pendingPayouts: pendingPayouts[0]?.totalPending || 0,
      period,
      dateRange: { start, end }
    });
  } catch (error) {
    console.error('Financial summary analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/analytics/export/:type
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { period = '30d', format = 'csv', startDate, endDate } = req.query;
    
    // Handle custom date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      const dateRange = getDateRange(period);
      start = dateRange.start;
      end = dateRange.end;
    }
    
    const userId = req.user._id;
    
    if (!['revenue', 'bookings', 'performance'].includes(type)) {
      return res.status(400).json({ message: 'Invalid export type' });
    }
    
    let data;
    let filename;
    
    switch (type) {
      case 'revenue':
        data = await Booking.find({
          checkIn: { $gte: start, $lte: end },
          status: { $in: ['confirmed', 'active', 'completed'] },
          ...(req.user.role === 'host' && { host: userId })
        }).populate('property', 'title location');
        
        filename = startDate && endDate ? 
          `revenue-report-${startDate}-to-${endDate}` : 
          `revenue-report-${period}-${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'bookings':
        data = await Booking.find({
          checkIn: { $gte: start, $lte: end },
          ...(req.user.role === 'host' && { host: userId })
        }).populate('property', 'title location').populate('guest', 'firstName lastName email');
        
        filename = startDate && endDate ? 
          `bookings-report-${startDate}-to-${endDate}` : 
          `bookings-report-${period}-${new Date().toISOString().split('T')[0]}`;
        break;
        
      case 'performance':
        data = await Booking.aggregate([
          {
            $match: {
              checkIn: { $gte: start, $lte: end },
              status: { $in: ['confirmed', 'active', 'completed'] },
              ...(req.user.role === 'host' && { host: userId })
            }
          },
          {
            $lookup: {
              from: 'rentals',
              localField: 'property',
              foreignField: '_id',
              as: 'propertyDetails'
            }
          },
          { $unwind: '$propertyDetails' },
          {
            $group: {
              _id: '$property',
              propertyTitle: { $first: '$propertyDetails.title' },
              totalBookings: { $sum: 1 },
              totalRevenue: { $sum: '$pricing.totalAmount' },
              averageRate: { $avg: '$pricing.basePrice' }
            }
          }
        ]);
        
        filename = startDate && endDate ? 
          `performance-report-${startDate}-to-${endDate}` : 
          `performance-report-${period}-${new Date().toISOString().split('T')[0]}`;
        break;
    }
    
    if (format === 'csv') {
      let csvContent = '';
      
      if (type === 'revenue') {
        csvContent = 'Date,Property,Location,Amount,Status\n';
        data.forEach(item => {
          csvContent += `${item.checkIn.toISOString().split('T')[0]},${item.property?.title || ''},${item.property?.location?.formattedAddress || ''},${item.pricing.totalAmount},${item.status}\n`;
        });
      } else if (type === 'bookings') {
        csvContent = 'Date,Property,Location,Guest,Amount,Status\n';
        data.forEach(item => {
          csvContent += `${item.checkIn.toISOString().split('T')[0]},${item.property?.title || ''},${item.property?.location?.formattedAddress || ''},${item.guest?.firstName || ''} ${item.guest?.lastName || ''},${item.pricing.totalAmount},${item.status}\n`;
        });
      } else if (type === 'performance') {
        csvContent = 'Property,Total Bookings,Total Revenue,Average Rate\n';
        data.forEach(item => {
          csvContent += `${item.propertyTitle || ''},${item.totalBookings},${item.totalRevenue},${item.averageRate}\n`;
        });
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      // Generate PDF using puppeteer
      try {
        const browser = await puppeteer.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Create HTML content for the PDF
        let htmlContent = generatePDFHTML(type, data, start, end, period);
        
        await page.setContent(htmlContent);
        await page.waitForTimeout(1000); // Wait for content to render
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
          printBackground: true
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({ message: 'Failed to generate PDF' });
      }
    } else if (format === 'excel') {
      // Generate Excel file using xlsx
      try {
        let worksheet;
        let workbook = XLSX.utils.book_new();
        
        switch (type) {
          case 'revenue':
            worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
              Date: item.checkIn.toISOString().split('T')[0],
              Property: item.property?.title || '',
              Location: item.property?.location?.formattedAddress || '',
              Amount: item.pricing.totalAmount,
              Status: item.status
            })));
            break;
            
          case 'bookings':
            worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
              Date: item.checkIn.toISOString().split('T')[0],
              Property: item.property?.title || '',
              Location: item.property?.location?.formattedAddress || '',
              Guest: `${item.guest?.firstName || ''} ${item.guest?.lastName || ''}`.trim(),
              Amount: item.pricing.totalAmount,
              Status: item.status
            })));
            break;
            
          case 'performance':
            worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
              Property: item.propertyTitle || '',
              'Total Bookings': item.totalBookings,
              'Total Revenue': item.totalRevenue,
              'Average Rate': item.averageRate
            })));
            break;
        }
        
        XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));
        
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
        res.send(excelBuffer);
      } catch (excelError) {
        console.error('Excel generation error:', excelError);
        res.status(500).json({ message: 'Failed to generate Excel file' });
      }
    } else {
      res.json({ data, filename });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to generate HTML for PDF
function generatePDFHTML(type, data, start, end, period) {
  const formatDate = (date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
  
  let tableRows = '';
  let title = '';
  
  switch (type) {
    case 'revenue':
      title = 'Revenue Report';
      tableRows = `
        <tr style="background-color: #f8f9fa;">
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Date</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Property</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Location</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Amount</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Status</th>
        </tr>
      `;
      data.forEach(item => {
        tableRows += `
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatDate(item.checkIn)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.property?.title || ''}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.property?.location?.formattedAddress || ''}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatCurrency(item.pricing.totalAmount)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.status}</td>
          </tr>
        `;
      });
      break;
      
    case 'bookings':
      title = 'Bookings Report';
      tableRows = `
        <tr style="background-color: #f8f9fa;">
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Date</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Property</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Location</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Guest</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Amount</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Status</th>
        </tr>
      `;
      data.forEach(item => {
        tableRows += `
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatDate(item.checkIn)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.property?.title || ''}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.property?.location?.formattedAddress || ''}</td>
            <td style="border: 11px solid #dee2e6; padding: 8px;">${item.guest?.firstName || ''} ${item.guest?.lastName || ''}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatCurrency(item.pricing.totalAmount)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.status}</td>
          </tr>
        `;
      });
      break;
      
    case 'performance':
      title = 'Property Performance Report';
      tableRows = `
        <tr style="background-color: #f8f9fa;">
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Property</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Total Bookings</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Total Revenue</th>
          <th style="border: 1px solid #dee2e6; padding: 12px; text-align: left;">Average Rate</th>
        </tr>
      `;
      data.forEach(item => {
        tableRows += `
          <tr>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.propertyTitle || ''}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${item.totalBookings}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatCurrency(item.totalRevenue)}</td>
            <td style="border: 1px solid #dee2e6; padding: 8px;">${formatCurrency(item.averageRate)}</td>
          </tr>
        `;
      });
      break;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .header h1 { color: #333; margin: 0; }
        .header p { color: #666; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .summary h3 { margin: 0 0 10px 0; color: #333; }
        .summary p { margin: 5px 0; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p>Period: ${formatDate(start)} - ${formatDate(end)}</p>
        <p>Total Records: ${data.length}</p>
      </div>
      
      <div class="summary">
        <h3>Report Summary</h3>
        <p><strong>Report Type:</strong> ${title}</p>
        <p><strong>Date Range:</strong> ${formatDate(start)} to ${formatDate(end)}</p>
        <p><strong>Total Items:</strong> ${data.length}</p>
      </div>
      
      <table>
        ${tableRows}
      </table>
    </body>
    </html>
  `;
}

module.exports = router;
