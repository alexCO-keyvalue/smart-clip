const axios = require('axios');

const API_BASE = 'http://127.0.0.1:8000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
  }

  // Get all clipboard entries
  async getClipboardHistory() {
    try {
      const response = await axios.get(`${this.baseURL}/api/clipboard`);
      return response.data;
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
      throw error;
    }
  }

  // Search clipboard entries
  async searchClipboard(query) {
    try {
      const response = await axios.get(`${this.baseURL}/api/clipboard/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // Save clipboard content
  async saveClipboardContent(content, type = 'text', sourceApp = 'unknown', tags = []) {
    try {
      const response = await axios.post(`${this.baseURL}/api/clipboard`, {
        content,
        type,
        source_app: sourceApp,
        tags
      });
      return response.data;
    } catch (error) {
      console.error('Failed to save clipboard content:', error);
      throw error;
    }
  }

  // Delete clipboard entry
  async deleteClipboardEntry(id) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/clipboard/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete clipboard entry:', error);
      throw error;
    }
  }
}

module.exports = ApiClient; 