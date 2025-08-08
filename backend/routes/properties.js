const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/properties');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// GET /api/properties - Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      type,
      category,
      minPrice,
      maxPrice,
      guests,
      bedrooms,
      bathrooms,
      amenities,
      location,
      checkIn,
      checkOut,
      instantBookable,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.formattedAddress': { $regex: search, $options: 'i' } }
      ];
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter['pricing.basePrice'] = {};
      if (minPrice) filter['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    // Capacity filters
    if (guests) {
      filter['capacity.guests'] = { $gte: parseInt(guests) };
    }

    if (bedrooms) {
      filter['capacity.bedrooms'] = { $gte: parseInt(bedrooms) };
    }

    if (bathrooms) {
      filter['capacity.bathrooms'] = { $gte: parseInt(bathrooms) };
    }

    // Amenities filter
    if (amenities) {
      const amenityArray = amenities.split(',');
      filter['amenities.items'] = { $all: amenityArray };
    }

    // Location filter (if coordinates provided)
    if (location) {
      const [lat, lng, radius = 50] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        };
      }
    }

    // Availability filter
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      // Get properties that are available for the date range
      const conflictingBookings = await Booking.find({
        status: { $in: ['confirmed', 'active'] },
        $or: [
          {
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
          }
        ]
      }).distinct('property');

      filter._id = { $nin: conflictingBookings };
    }

    // Instant bookable filter
    if (instantBookable === 'true') {
      filter['availability.instantBookable'] = true;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const properties = await Property.find(filter)
      .populate('host', 'name avatar rating')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Property.countDocuments(filter);

    res.json({
      properties,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/properties/:id - Get property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('host', 'name email phone avatar rating stats')
      .populate({
        path: 'reviews',
        populate: {
          path: 'reviewer',
          select: 'name avatar'
        }
      });

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Increment view count
    property.views += 1;
    await property.save();

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/properties - Create new property (host only)
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    // Check if user is a host
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only hosts can create properties' });
    }

    const {
      title,
      description,
      type,
      category,
      location,
      pricing,
      capacity,
      amenities,
      rules,
      availability
    } = req.body;

    // Process uploaded images
    const images = req.files ? req.files.map((file, index) => ({
      url: `/uploads/properties/${file.filename}`,
      caption: req.body.imageCaptions ? req.body.imageCaptions[index] : '',
      isPrimary: index === 0,
      order: index
    })) : [];

    const property = new Property({
      title,
      description,
      type,
      category,
      host: req.user.id,
      location: JSON.parse(location),
      pricing: JSON.parse(pricing),
      capacity: JSON.parse(capacity),
      amenities: JSON.parse(amenities),
      rules: JSON.parse(rules),
      availability: JSON.parse(availability),
      images
    });

    await property.save();
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/properties/:id - Update property (host only)
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns the property
    if (property.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Process new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/properties/${file.filename}`,
        caption: req.body.imageCaptions ? req.body.imageCaptions[index] : '',
        isPrimary: false,
        order: property.images.length + index
      }));
      
      property.images.push(...newImages);
    }

    // Update other fields
    const updateFields = ['title', 'description', 'type', 'category', 'location', 'pricing', 'capacity', 'amenities', 'rules', 'availability'];
    updateFields.forEach(field => {
      if (req.body[field]) {
        property[field] = JSON.parse(req.body[field]);
      }
    });

    await property.save();
    res.json(property);
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/properties/:id - Delete property (host only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if user owns the property
    if (property.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if property has active bookings
    const activeBookings = await Booking.find({
      property: property._id,
      status: { $in: ['confirmed', 'active'] }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({ message: 'Cannot delete property with active bookings' });
    }

    // Delete associated images
    property.images.forEach(image => {
      const imagePath = path.join(__dirname, '..', image.url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/properties/:id/availability - Get property availability
router.get('/:id/availability', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const bookings = await Booking.getPropertyBookings(
      property._id,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
