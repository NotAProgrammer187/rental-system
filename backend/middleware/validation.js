const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// Property validation rules
const validateProperty = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  
  body('type')
    .isIn(['apartment', 'house', 'condo', 'villa', 'cabin', 'studio', 'loft'])
    .withMessage('Invalid property type'),
  
  body('category')
    .isIn(['entire-place', 'private-room', 'shared-room'])
    .withMessage('Invalid category'),
  
  body('pricing.basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  
  body('capacity.guests')
    .isInt({ min: 1, max: 20 })
    .withMessage('Guests must be between 1 and 20'),
  
  body('capacity.bedrooms')
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative number'),
  
  body('capacity.beds')
    .isInt({ min: 1 })
    .withMessage('Beds must be at least 1'),
  
  body('capacity.bathrooms')
    .isInt({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  
  validate
];

// Booking validation rules
const validateBooking = [
  body('propertyId')
    .isMongoId()
    .withMessage('Invalid property ID'),
  
  body('checkIn')
    .isISO8601()
    .withMessage('Invalid check-in date'),
  
  body('checkOut')
    .isISO8601()
    .withMessage('Invalid check-out date'),
  
  body('guests.adults')
    .isInt({ min: 1 })
    .withMessage('At least one adult is required'),
  
  body('guests.children')
    .isInt({ min: 0 })
    .withMessage('Children must be a non-negative number'),
  
  body('guests.infants')
    .isInt({ min: 0 })
    .withMessage('Infants must be a non-negative number'),
  
  body('guests.pets')
    .isInt({ min: 0 })
    .withMessage('Pets must be a non-negative number'),
  
  validate
];

// User validation rules
const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  validate
];

// Review validation rules
const validateReview = [
  body('rating.overall')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  
  body('rating.cleanliness')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Cleanliness rating must be between 1 and 5'),
  
  body('rating.accuracy')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Accuracy rating must be between 1 and 5'),
  
  body('rating.communication')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  
  body('rating.location')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Location rating must be between 1 and 5'),
  
  body('rating.checkIn')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Check-in rating must be between 1 and 5'),
  
  body('rating.value')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Value rating must be between 1 and 5'),
  
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  
  validate
];

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  // Sanitize string fields
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '') // Remove < and >
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes for auth
const apiRateLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes for API

module.exports = {
  validate,
  validateProperty,
  validateBooking,
  validateUser,
  validateReview,
  sanitizeInput,
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter
};
