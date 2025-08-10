const mongoose = require('mongoose');
const crypto = require('crypto');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: function() {
      return !this.attachments || this.attachments.length === 0;
    },
    maxlength: 2000
  },
  encryptedContent: {
    type: String,
    select: false // Don't include in queries by default
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'auto_reply', 'system'],
    default: 'text'
  },
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true,
      max: 10 * 1024 * 1024 // 10MB limit
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String // For image previews
    },
    isImage: {
      type: Boolean,
      default: false
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    isFromTemplate: {
      type: Boolean,
      default: false
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate'
    },
    isAutoReply: {
      type: Boolean,
      default: false
    }
  },
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1
    },
    magnitude: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ conversation: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// Encryption key (MUST be set in production)
if (!process.env.MESSAGE_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error('🚨 SECURITY ERROR: MESSAGE_ENCRYPTION_KEY is required in production!');
  process.exit(1);
}

// Ensure encryption key is properly formatted as a 32-byte Buffer
let ENCRYPTION_KEY;
if (process.env.MESSAGE_ENCRYPTION_KEY) {
  // If it's a hex string, convert to Buffer
  if (process.env.MESSAGE_ENCRYPTION_KEY.length === 64) {
    ENCRYPTION_KEY = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'hex');
  } else {
    // If it's not hex, use it as-is (for development)
    ENCRYPTION_KEY = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'utf8');
  }
  
  // Ensure it's exactly 32 bytes for AES-256
  if (ENCRYPTION_KEY.length !== 32) {
    // Pad or truncate to 32 bytes
    const keyBuffer = Buffer.alloc(32);
    ENCRYPTION_KEY.copy(keyBuffer, 0, 0, Math.min(ENCRYPTION_KEY.length, 32));
    ENCRYPTION_KEY = keyBuffer;
  }
} else if (process.env.NODE_ENV === 'development') {
  // Generate a consistent key for development
  ENCRYPTION_KEY = crypto.scryptSync('dev-key', 'salt', 32);
} else {
  throw new Error('MESSAGE_ENCRYPTION_KEY environment variable is required in production');
}

const ALGORITHM = 'aes-256-cbc';

// Method to encrypt message content
messageSchema.methods.encryptContent = function(content) {
  if (!content) return null;
  
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      data: encrypted
    };
  } catch (error) {
    throw error;
  }
};

// Method to decrypt message content
messageSchema.methods.decryptContent = function() {
  if (!this.encryptedContent) return this.content;
  
  try {
    const encData = JSON.parse(this.encryptedContent);
    const iv = Buffer.from(encData.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted message - decryption failed]';
  }
};

// Pre-save middleware for encryption
messageSchema.pre('save', function(next) {
  if (this.content && this.isModified('content')) {
    // Store encrypted version
    this.encryptedContent = JSON.stringify(this.encryptContent(this.content));
    // Keep plain text for searching (in production, consider using searchable encryption)
    // For now, we'll keep both for functionality
  }
  next();
});

// Method to mark message as read
messageSchema.methods.markAsRead = function(userId) {
  if (!this.readBy.find(r => r.user.toString() === userId.toString())) {
    this.readBy.push({ user: userId, readAt: new Date() });
  }
  if (this.recipient.toString() === userId.toString()) {
    this.isRead = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Method to check if user can see this message
messageSchema.methods.canUserAccess = function(userId) {
  return this.sender.toString() === userId.toString() || 
         this.recipient.toString() === userId.toString();
};

// Static method to get conversation messages with pagination
messageSchema.statics.getConversationMessages = async function(conversationId, page = 1, limit = 50, userId) {
  const skip = (page - 1) * limit;
  
  const messages = await this.find({
    conversation: conversationId,
    isDeleted: false,
    $or: [
      { sender: userId },
      { recipient: userId }
    ]
  })
  .populate('sender', 'name avatar')
  .populate('recipient', 'name avatar')
  .populate('replyTo', 'content sender')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
  
  return messages.reverse(); // Return in ascending order for chat display
};

// Static method to search messages
messageSchema.statics.searchMessages = async function(conversationId, query, userId) {
  return this.find({
    conversation: conversationId,
    isDeleted: false,
    $or: [
      { sender: userId },
      { recipient: userId }
    ],
    content: { $regex: query, $options: 'i' }
  })
  .populate('sender', 'name avatar')
  .populate('recipient', 'name avatar')
  .sort({ createdAt: -1 })
  .limit(100);
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isDeleted: false
  });
};

// Virtual for formatting created date
messageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString();
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);
