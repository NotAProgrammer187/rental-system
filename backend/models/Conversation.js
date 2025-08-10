const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'guest'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true
  },
  conversationType: {
    type: String,
    enum: ['booking_inquiry', 'booking_confirmed', 'support', 'general'],
    default: 'general'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    archivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed', 'pending'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    checkInDate: Date,
    checkOutDate: Date,
    totalAmount: Number,
    guestCount: Number,
    automaticRepliesEnabled: {
      type: Boolean,
      default: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowVoiceMessages: {
      type: Boolean,
      default: true
    },
    messageRetention: {
      type: Number,
      default: 365 // days
    }
  },
  messageCount: {
    type: Number,
    default: 0
  },
  unreadCount: {
    host: {
      type: Number,
      default: 0
    },
    guest: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ booking: 1 });
conversationSchema.index({ property: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isArchived: 1, lastMessageAt: -1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });

// Compound indexes
conversationSchema.index({ 
  'participants.user': 1, 
  isArchived: 1, 
  lastMessageAt: -1 
});

// Method to add participant
conversationSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
  } else if (!existingParticipant.isActive) {
    existingParticipant.isActive = true;
    existingParticipant.leftAt = null;
  }
  
  return this.save();
};

// Method to remove participant
conversationSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    participant.leftAt = new Date();
  }
  
  return this.save();
};

// Method to check if user is participant
conversationSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => {
    const participantUserId = p.user._id ? p.user._id.toString() : p.user.toString();
    const currentUserId = userId.toString();
    return participantUserId === currentUserId && p.isActive;
  });
};

// Method to get other participant (for 1-on-1 conversations)
conversationSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(p => {
    const participantUserId = p.user._id ? p.user._id.toString() : p.user.toString();
    const currentUserId = userId.toString();
    return participantUserId !== currentUserId && p.isActive;
  });
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function(messageId, senderId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  this.messageCount += 1;
  
  // Update unread count for the recipient
  const senderParticipant = this.participants.find(
    p => p.user.toString() === senderId.toString()
  );
  
  if (senderParticipant) {
    const recipientRole = senderParticipant.role === 'host' ? 'guest' : 'host';
    this.unreadCount[recipientRole] += 1;
  }
  
  return this.save();
};

// Method to mark as read by user
conversationSchema.methods.markAsReadBy = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant) {
    const userRole = participant.role;
    this.unreadCount[userRole] = 0;
  }
  
  return this.save();
};

// Method to archive conversation for user
conversationSchema.methods.archiveForUser = function(userId) {
  const existingArchive = this.archivedBy.find(
    a => a.user.toString() === userId.toString()
  );
  
  if (!existingArchive) {
    this.archivedBy.push({
      user: userId,
      archivedAt: new Date()
    });
  }
  
  // If all participants have archived, mark conversation as archived
  const activeParticipants = this.participants.filter(p => p.isActive);
  const archivedCount = this.archivedBy.length;
  
  if (archivedCount >= activeParticipants.length) {
    this.isArchived = true;
  }
  
  return this.save();
};

// Method to unarchive conversation for user
conversationSchema.methods.unarchiveForUser = function(userId) {
  this.archivedBy = this.archivedBy.filter(
    a => a.user.toString() !== userId.toString()
  );
  
  this.isArchived = false;
  
  return this.save();
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreateConversation = async function(hostId, guestId, propertyId, bookingId = null) {
  // Try to find existing conversation
  let conversation = await this.findOne({
    'participants.user': { $all: [hostId, guestId] },
    property: propertyId,
    ...(bookingId && { booking: bookingId })
  }).populate('participants.user', 'name avatar role')
    .populate('lastMessage')
    .populate('property', 'title');
  
  if (!conversation) {
    // Create new conversation
    conversation = new this({
      participants: [
        { user: hostId, role: 'host' },
        { user: guestId, role: 'guest' }
      ],
      property: propertyId,
      ...(bookingId && { booking: bookingId }),
      conversationType: bookingId ? 'booking_confirmed' : 'booking_inquiry'
    });
    
    await conversation.save();
    await conversation.populate('participants.user', 'name avatar role');
    await conversation.populate('property', 'title');
  }
  
  return conversation;
};

// Static method to get user conversations
conversationSchema.statics.getUserConversations = async function(userId, isArchived = false, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const archivedCondition = isArchived 
    ? { 'archivedBy.user': userId }
    : { 'archivedBy.user': { $ne: userId } };
  
  return this.find({
    'participants.user': userId,
    'participants.isActive': true,
    ...archivedCondition
  })
  .populate('participants.user', 'name avatar role')
  .populate('lastMessage', 'content messageType createdAt sender')
  .populate('property', 'title images')
  .populate('booking', 'checkIn checkOut status')
  .sort({ lastMessageAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Virtual for getting participant names
conversationSchema.virtual('participantNames').get(function() {
  return this.participants
    .filter(p => p.isActive)
    .map(p => p.user.name)
    .join(', ');
});

// Virtual for getting conversation title
conversationSchema.virtual('title').get(function() {
  if (this.subject) return this.subject;
  if (this.property && this.property.title) return this.property.title;
  return this.participantNames;
});

// Ensure virtual fields are serialized
conversationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Conversation', conversationSchema);
