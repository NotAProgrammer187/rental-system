const express = require('express');
const router = express.Router();
const { auth, isHost } = require('../middleware/auth');
const MessageTemplate = require('../models/MessageTemplate');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const websocketService = require('../services/websocketService');

// GET /api/message-templates - Get user's templates
router.get('/', auth, async (req, res) => {
  try {
    const { category, includeDefault = false } = req.query;

    let templates = await MessageTemplate.getUserTemplates(req.user._id, category);

    // Include default templates if requested
    if (includeDefault === 'true') {
      const defaultTemplates = await MessageTemplate.getDefaultTemplates(category);
      templates = [...templates, ...defaultTemplates];
    }

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates' 
    });
  }
});

// GET /api/message-templates/default - Get default templates
router.get('/default', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await MessageTemplate.getDefaultTemplates(category);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching default templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch default templates' 
    });
  }
});

// GET /api/message-templates/search - Search templates
router.get('/search', auth, async (req, res) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search term must be at least 2 characters' 
      });
    }

    const templates = await MessageTemplate.searchTemplates(req.user._id, searchTerm);

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search templates' 
    });
  }
});

// GET /api/message-templates/:id - Get specific template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await MessageTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Check if user owns template or it's a default template
    if (template.owner.toString() !== req.user._id.toString() && !template.isDefault) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch template' 
    });
  }
});

// POST /api/message-templates - Create new template
router.post('/', auth, async (req, res) => {
  try {
    const { 
      name, 
      content, 
      category = 'custom', 
      tags = [], 
      variables = [],
      autoReplyTriggers = [],
      metadata = {}
    } = req.body;

    if (!name || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and content are required' 
      });
    }

    const template = new MessageTemplate({
      name: name.trim(),
      content: content.trim(),
      category,
      tags,
      variables,
      autoReplyTriggers,
      metadata,
      owner: req.user._id
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create template' 
    });
  }
});

// PUT /api/message-templates/:id - Update template
router.put('/:id', auth, async (req, res) => {
  try {
    const template = await MessageTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Check ownership
    if (template.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const { 
      name, 
      content, 
      category, 
      tags, 
      variables,
      autoReplyTriggers,
      metadata,
      isActive
    } = req.body;

    // Update fields
    if (name !== undefined) template.name = name.trim();
    if (content !== undefined) template.content = content.trim();
    if (category !== undefined) template.category = category;
    if (tags !== undefined) template.tags = tags;
    if (variables !== undefined) template.variables = variables;
    if (autoReplyTriggers !== undefined) template.autoReplyTriggers = autoReplyTriggers;
    if (metadata !== undefined) template.metadata = { ...template.metadata, ...metadata };
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update template' 
    });
  }
});

// DELETE /api/message-templates/:id - Delete template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await MessageTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Check ownership
    if (template.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await MessageTemplate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete template' 
    });
  }
});

// POST /api/message-templates/:id/use - Use template to send message
router.post('/:id/use', auth, async (req, res) => {
  try {
    const { conversationId, variables = {}, customContent } = req.body;

    // Get template
    const template = await MessageTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Check access to template
    if (template.owner.toString() !== req.user._id.toString() && !template.isDefault) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to template' 
      });
    }

    // Verify conversation access
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to conversation' 
      });
    }

    // Validate required variables
    const validation = template.validateVariables(variables);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required variables',
        missingVariables: validation.missingVariables
      });
    }

    // Render template content
    const content = customContent || template.renderContent(variables);

    // Get recipient
    const otherParticipant = conversation.getOtherParticipant(req.user._id);
    if (!otherParticipant) {
      return res.status(400).json({ 
        success: false, 
        message: 'No recipient found' 
      });
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      recipient: otherParticipant.user,
      content: content,
      messageType: 'text',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        isFromTemplate: true,
        templateId: template._id
      }
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');

    // Update conversation
    await conversation.updateLastMessage(message._id, req.user._id);

    // Increment template usage
    await template.incrementUsage();

    // Send via WebSocket
    websocketService.sendToConversation(conversationId, 'new_message', {
      message: message,
      conversationId: conversationId
    });

    // Send notification to offline users
    if (!websocketService.isUserOnline(otherParticipant.user)) {
      await websocketService.sendNotificationToUser(otherParticipant.user, {
        type: 'new_message',
        title: `New message from ${req.user.name}`,
        body: content.substring(0, 100),
        conversationId: conversationId,
        senderId: req.user._id
      });
    }

    res.status(201).json({
      success: true,
      data: {
        message: message,
        template: template
      }
    });
  } catch (error) {
    console.error('Error using template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to use template' 
    });
  }
});

// POST /api/message-templates/:id/preview - Preview template with variables
router.post('/:id/preview', auth, async (req, res) => {
  try {
    const { variables = {} } = req.body;

    const template = await MessageTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        message: 'Template not found' 
      });
    }

    // Check access to template
    if (template.owner.toString() !== req.user._id.toString() && !template.isDefault) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const renderedContent = template.renderContent(variables);
    const validation = template.validateVariables(variables);

    res.json({
      success: true,
      data: {
        content: renderedContent,
        validation: validation,
        template: {
          name: template.name,
          variables: template.variables,
          wordCount: template.wordCount,
          estimatedReadTime: template.metadata.estimatedReadTime
        }
      }
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to preview template' 
    });
  }
});

// GET /api/message-templates/auto-reply/check - Check for auto-reply triggers
router.post('/auto-reply/check', auth, async (req, res) => {
  try {
    const { messageContent, conversationId } = req.body;

    if (!messageContent || !conversationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content and conversation ID are required' 
      });
    }

    // Get conversation context
    const conversation = await Conversation.findById(conversationId)
      .populate('booking', 'checkIn checkOut createdAt')
      .populate('property', 'title');

    if (!conversation || !conversation.isParticipant(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Get user's active templates with auto-reply triggers
    const templates = await MessageTemplate.find({
      owner: req.user._id,
      isActive: true,
      'autoReplyTriggers.0': { $exists: true }
    });

    const context = {
      checkInDate: conversation.booking?.checkIn,
      bookingDate: conversation.booking?.createdAt,
      propertyName: conversation.property?.title
    };

    // Find matching templates
    const matchingTemplates = templates.filter(template => 
      template.shouldTriggerAutoReply(messageContent, context)
    );

    res.json({
      success: true,
      data: {
        shouldReply: matchingTemplates.length > 0,
        templates: matchingTemplates.map(t => ({
          id: t._id,
          name: t.name,
          content: t.content,
          category: t.category
        }))
      }
    });
  } catch (error) {
    console.error('Error checking auto-reply:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check auto-reply' 
    });
  }
});

// POST /api/message-templates/bulk-import - Import default templates
router.post('/bulk-import', auth, async (req, res) => {
  try {
    // Only hosts can import templates
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only hosts can import templates' 
      });
    }

    const defaultTemplates = [
      {
        name: 'Welcome Message',
        content: 'Hi {{guestName}}! Welcome to {{propertyName}}. I\'m excited to host you. If you have any questions before your arrival, please don\'t hesitate to ask!',
        category: 'welcome_message',
        variables: [
          { name: 'guestName', description: 'Guest name', isRequired: true },
          { name: 'propertyName', description: 'Property name', isRequired: true }
        ]
      },
      {
        name: 'Check-in Instructions',
        content: 'Hello {{guestName}}! Your check-in is tomorrow at {{checkInTime}}. The property address is {{propertyAddress}}. The key/access instructions: {{accessInstructions}}. Let me know if you need anything!',
        category: 'check_in_instructions',
        variables: [
          { name: 'guestName', description: 'Guest name', isRequired: true },
          { name: 'checkInTime', description: 'Check-in time', isRequired: true },
          { name: 'propertyAddress', description: 'Property address', isRequired: true },
          { name: 'accessInstructions', description: 'How to access the property', isRequired: true }
        ]
      },
      {
        name: 'Thank You Message',
        content: 'Thank you for staying at {{propertyName}}, {{guestName}}! I hope you had a wonderful experience. If you enjoyed your stay, I\'d greatly appreciate a review. Safe travels!',
        category: 'thank_you',
        variables: [
          { name: 'guestName', description: 'Guest name', isRequired: true },
          { name: 'propertyName', description: 'Property name', isRequired: true }
        ]
      },
      {
        name: 'Emergency Contact',
        content: 'For any emergencies during your stay, please contact me at {{emergencyPhone}} or {{emergencyEmail}}. For medical emergencies, call 911. The property address is {{propertyAddress}}.',
        category: 'emergency_contact',
        variables: [
          { name: 'emergencyPhone', description: 'Emergency phone number', isRequired: true },
          { name: 'emergencyEmail', description: 'Emergency email', isRequired: true },
          { name: 'propertyAddress', description: 'Property address', isRequired: true }
        ]
      }
    ];

    const createdTemplates = [];

    for (const templateData of defaultTemplates) {
      // Check if template already exists
      const existing = await MessageTemplate.findOne({
        owner: req.user._id,
        name: templateData.name,
        category: templateData.category
      });

      if (!existing) {
        const template = new MessageTemplate({
          ...templateData,
          owner: req.user._id
        });
        await template.save();
        createdTemplates.push(template);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        imported: createdTemplates.length,
        templates: createdTemplates
      },
      message: `Successfully imported ${createdTemplates.length} templates`
    });
  } catch (error) {
    console.error('Error importing templates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to import templates' 
    });
  }
});

module.exports = router;
