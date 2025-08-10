const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'booking_confirmation',
      'check_in_instructions',
      'check_out_instructions',
      'welcome_message',
      'thank_you',
      'common_questions',
      'emergency_contact',
      'custom'
    ],
    default: 'custom'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    defaultValue: {
      type: String
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  autoReplyTriggers: [{
    keywords: [String],
    conditions: {
      timeOfDay: {
        start: String, // "09:00"
        end: String    // "17:00"
      },
      daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
      beforeCheckIn: {
        enabled: Boolean,
        days: Number
      },
      afterBooking: {
        enabled: Boolean,
        hours: Number
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  metadata: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko']
    },
    tone: {
      type: String,
      enum: ['formal', 'casual', 'friendly', 'professional'],
      default: 'friendly'
    },
    estimatedReadTime: {
      type: Number // in seconds
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageTemplateSchema.index({ owner: 1, isActive: 1 });
messageTemplateSchema.index({ category: 1, isActive: 1 });
messageTemplateSchema.index({ tags: 1 });
messageTemplateSchema.index({ usageCount: -1 });

// Method to replace variables in template
messageTemplateSchema.methods.renderContent = function(variables = {}) {
  let content = this.content;
  
  // Replace template variables like {{guestName}}, {{propertyName}}, etc.
  const variableRegex = /\{\{(\w+)\}\}/g;
  
  content = content.replace(variableRegex, (match, variableName) => {
    const variable = this.variables.find(v => v.name === variableName);
    
    if (variables[variableName]) {
      return variables[variableName];
    } else if (variable && variable.defaultValue) {
      return variable.defaultValue;
    } else {
      return match; // Keep original if no replacement found
    }
  });
  
  return content;
};

// Method to validate required variables
messageTemplateSchema.methods.validateVariables = function(variables = {}) {
  const missing = [];
  
  this.variables.forEach(variable => {
    if (variable.isRequired && !variables[variable.name]) {
      missing.push(variable.name);
    }
  });
  
  return {
    isValid: missing.length === 0,
    missingVariables: missing
  };
};

// Method to increment usage count
messageTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Method to check if auto-reply should trigger
messageTemplateSchema.methods.shouldTriggerAutoReply = function(messageContent, context = {}) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
  const currentDay = now.getDay();
  
  return this.autoReplyTriggers.some(trigger => {
    if (!trigger.isActive) return false;
    
    // Check keyword matching
    const hasKeywordMatch = trigger.keywords.some(keyword => 
      messageContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!hasKeywordMatch) return false;
    
    // Check time conditions
    if (trigger.conditions.timeOfDay) {
      const { start, end } = trigger.conditions.timeOfDay;
      if (start && end) {
        if (currentTime < start || currentTime > end) {
          return false;
        }
      }
    }
    
    // Check day of week
    if (trigger.conditions.daysOfWeek && trigger.conditions.daysOfWeek.length > 0) {
      if (!trigger.conditions.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }
    
    // Check before check-in timing
    if (trigger.conditions.beforeCheckIn && trigger.conditions.beforeCheckIn.enabled && context.checkInDate) {
      const checkInDate = new Date(context.checkInDate);
      const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilCheckIn > trigger.conditions.beforeCheckIn.days) {
        return false;
      }
    }
    
    // Check after booking timing
    if (trigger.conditions.afterBooking && trigger.conditions.afterBooking.enabled && context.bookingDate) {
      const bookingDate = new Date(context.bookingDate);
      const hoursAfterBooking = (now - bookingDate) / (1000 * 60 * 60);
      
      if (hoursAfterBooking < trigger.conditions.afterBooking.hours) {
        return false;
      }
    }
    
    return true;
  });
};

// Static method to get user templates
messageTemplateSchema.statics.getUserTemplates = async function(userId, category = null) {
  const query = { 
    owner: userId, 
    isActive: true 
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ usageCount: -1, updatedAt: -1 });
};

// Static method to get default templates
messageTemplateSchema.statics.getDefaultTemplates = async function(category = null) {
  const query = { 
    isDefault: true,
    isActive: true 
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ category: 1, name: 1 });
};

// Static method to search templates
messageTemplateSchema.statics.searchTemplates = async function(userId, searchTerm) {
  return this.find({
    owner: userId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  }).sort({ usageCount: -1 });
};

// Pre-save middleware to calculate estimated read time
messageTemplateSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Estimate reading time (average 200 words per minute)
    const wordCount = this.content.split(/\s+/).length;
    this.metadata.estimatedReadTime = Math.ceil((wordCount / 200) * 60);
  }
  next();
});

// Virtual for word count
messageTemplateSchema.virtual('wordCount').get(function() {
  return this.content.split(/\s+/).length;
});

// Ensure virtual fields are serialized
messageTemplateSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
