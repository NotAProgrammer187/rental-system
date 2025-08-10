import api from './api';

class MessageService {
  // Conversations
  async getConversations(page = 1, limit = 20, archived = false) {
    try {
      const response = await api.get('/messages/conversations', {
        params: { page, limit, archived }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  async createConversation(participantId, propertyId, bookingId = null, subject = '') {
    try {
      const response = await api.post('/messages/conversations', {
        participantId,
        propertyId,
        bookingId,
        subject
      });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async archiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  async unarchiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/unarchive`);
      return response.data;
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(conversationId, page = 1, limit = 50) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage(conversationId, content, messageType = 'text', replyTo = null) {
    try {
      const response = await api.post(`/messages/conversations/${conversationId}/messages`, {
        content,
        messageType,
        replyTo
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async uploadFile(conversationId, file, caption = '') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await api.post(`/messages/conversations/${conversationId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId) {
    try {
      const response = await api.put(`/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async searchMessages(query, conversationId = null) {
    try {
      const params = { query };
      if (conversationId) {
        params.conversationId = conversationId;
      }

      const response = await api.get('/messages/search', { params });
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async getUnreadCount() {
    try {
      const response = await api.get('/messages/unread-count');
      return response.data;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Message Templates
  async getTemplates(category = null, includeDefault = false) {
    try {
      const params = {};
      if (category) params.category = category;
      if (includeDefault) params.includeDefault = 'true';

      const response = await api.get('/message-templates', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  async getDefaultTemplates(category = null) {
    try {
      const params = {};
      if (category) params.category = category;

      const response = await api.get('/message-templates/default', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching default templates:', error);
      throw error;
    }
  }

  async createTemplate(templateData) {
    try {
      const response = await api.post('/message-templates', templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(templateId, templateData) {
    try {
      const response = await api.put(`/message-templates/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(templateId) {
    try {
      const response = await api.delete(`/message-templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  async useTemplate(templateId, conversationId, variables = {}, customContent = null) {
    try {
      const response = await api.post(`/message-templates/${templateId}/use`, {
        conversationId,
        variables,
        customContent
      });
      return response.data;
    } catch (error) {
      console.error('Error using template:', error);
      throw error;
    }
  }

  async previewTemplate(templateId, variables = {}) {
    try {
      const response = await api.post(`/message-templates/${templateId}/preview`, {
        variables
      });
      return response.data;
    } catch (error) {
      console.error('Error previewing template:', error);
      throw error;
    }
  }

  async searchTemplates(searchTerm) {
    try {
      const response = await api.get('/message-templates/search', {
        params: { q: searchTerm }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching templates:', error);
      throw error;
    }
  }

  async checkAutoReply(messageContent, conversationId) {
    try {
      const response = await api.post('/message-templates/auto-reply/check', {
        messageContent,
        conversationId
      });
      return response.data;
    } catch (error) {
      console.error('Error checking auto-reply:', error);
      throw error;
    }
  }

  async importDefaultTemplates() {
    try {
      const response = await api.post('/message-templates/bulk-import');
      return response.data;
    } catch (error) {
      console.error('Error importing default templates:', error);
      throw error;
    }
  }

  // Utility methods
  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(extension);
  }

  getFileIcon(filename) {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    switch (extension) {
      case '.pdf':
        return '📄';
      case '.doc':
      case '.docx':
        return '📝';
      case '.xls':
      case '.xlsx':
        return '📊';
      case '.zip':
      case '.rar':
        return '🗜️';
      case '.mp3':
      case '.wav':
        return '🎵';
      case '.mp4':
      case '.avi':
        return '🎬';
      default:
        return '📎';
    }
  }

  validateFileUpload(file, maxSize = 10 * 1024 * 1024) { // 10MB default
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported. Please upload images, PDFs, or documents.');
    }

    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    return true;
  }

  // Mark single message as read
  async markMessageAsRead(messageId) {
    try {
      const response = await api.put(`/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Mark all messages in conversation as read
  async markConversationAsRead(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }
}

// Create singleton instance
const messageService = new MessageService();

export default messageService;
