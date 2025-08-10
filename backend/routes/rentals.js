const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Rental = require('../models/Rental');
const multer = require('multer');
const mongoose = require('mongoose');

// Configure multer for memory storage (to convert to Base64)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get all rentals
router.get('/', async (req, res) => {
  try {
    const rentals = await Rental.find().populate('owner', 'name email');
    res.json(rentals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rental by ID
router.get('/:id', async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('owner', 'name email');
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }
    res.json(rental);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve image by rental ID and image index
router.get('/:id/image/:imageIndex', async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (imageIndex < 0 || imageIndex >= rental.images.length) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const image = rental.images[imageIndex];
    
    // Handle both new Base64 format and legacy string format
    if (typeof image === 'object' && image && image.data && typeof image.data === 'string') {
      // New Base64 format
      if (!image.data || !image.contentType) {
        return res.status(404).json({ message: 'Image data not found' });
      }
      
      try {
        // Set appropriate headers
        res.set('Content-Type', image.contentType);
        res.set('Content-Length', image.size || image.data.length);
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        
        // Convert Base64 to buffer and send
        const imageBuffer = Buffer.from(image.data, 'base64');
        res.send(imageBuffer);
      } catch (bufferError) {
        console.error('Error processing image buffer:', bufferError);
        return res.status(500).json({ message: 'Error processing image' });
      }
    } else if (typeof image === 'string' && image) {
      // Legacy string format - redirect to the old uploads path
      // This handles existing rentals that still have file paths
      const isDevelopment = process.env.NODE_ENV === 'development';
      const baseURL = isDevelopment ? (process.env.API_URL || req.get('host')) : req.get('host');
      const imageUrl = `${baseURL}${image}`;
      
      // Redirect to the actual image file
      res.redirect(imageUrl);
    } else {
      return res.status(404).json({ message: 'Invalid image format' });
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new rental (protected route) with Base64 image storage
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    // Enforce host verification
    if (req.user.role !== 'admin' && req.user.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'You must be verified by an admin to list properties' });
    }
    const { title, description, price, location, bedrooms, bathrooms, squareFeet, propertyType } = req.body;
    
    // Validate required fields
    if (!title || !description || !price || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Process uploaded images and convert to Base64
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.buffer) {
          images.push({
            data: file.buffer.toString('base64'),
            contentType: file.mimetype,
            filename: file.originalname,
            size: file.size
          });
        }
      }
    }
    
    const rental = new Rental({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      location: location.trim(),
      bedrooms: parseInt(bedrooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      squareFeet: parseInt(squareFeet) || 0,
      propertyType: propertyType || 'apartment',
      images,
      owner: req.user._id
    });

    await rental.save();
    res.status(201).json(rental);
  } catch (error) {
    console.error('Error creating rental:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update rental (protected route)
router.put('/:id', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Check if user is the owner
    if (rental.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, price, location, bedrooms, bathrooms, squareFeet, propertyType } = req.body;

    rental.title = title || rental.title;
    rental.description = description || rental.description;
    rental.price = price ? parseFloat(price) : rental.price;
    rental.location = location || rental.location;
    rental.bedrooms = bedrooms ? parseInt(bedrooms) : rental.bedrooms;
    rental.bathrooms = bathrooms ? parseInt(bathrooms) : rental.bathrooms;
    rental.squareFeet = squareFeet ? parseInt(squareFeet) : rental.squareFeet;
    rental.propertyType = propertyType || rental.propertyType;

    await rental.save();
    res.json(rental);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete rental (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    // Check if user is the owner
    if (rental.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await rental.deleteOne();
    res.json({ message: 'Rental deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
