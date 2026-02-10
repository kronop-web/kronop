// ==================== GROQ AI SERVICE ====================
// AI-powered support chat using Groq API

const GROQ_API_URL = process.env.EXPO_PUBLIC_GROQ_API_URL || process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class GroqAIService {
  private apiKey: string;
  private model: string = 'llama-3.3-70b-versatile'; // Using current Llama 3.3 70B model

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Groq API key not found in configuration');
    }
  }

  /**
   * Send message to Groq AI and get response
   */
  async sendMessage(messages: GroqMessage[]): Promise<string> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Groq API key not configured - using fallback mode');
        return this.getFallbackResponse();
      }

      // Add system prompt with Kronop branding and personality
      const systemMessage: GroqMessage = {
        role: 'system',
        content: `You are a helpful AI assistant for Kronop, a video sharing platform. You should:

1. Be friendly, professional, and helpful
2. Use Kronop's blue-purple theme colors in your responses when relevant
3. Help users with profile management, video uploads, settings, and general app usage
4. Keep responses concise but informative
5. If you don't know something, be honest and suggest contacting support
6. Use emojis occasionally to make conversations more engaging
7. Respond in the language the user is using (Hindi, English, etc.)

Kronop is a video sharing platform where users can upload reels, videos, photos, and go live. Users can also support creators and earn from their content.`
      };

      const requestMessages = [systemMessage, ...messages];

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: requestMessages,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`⚠️ Groq API ${response.status}:`, errorData);
        
        if (response.status === 401) {
          return this.getAuthErrorResponse();
        }
        
        throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data: GroqResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq AI');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Groq AI Error:', error);
      
      // Fallback response for API errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return this.getAuthErrorResponse();
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return '🌐 Network issue detected. Please check your internet connection and try again.';
      }
      
      return '🤖 I apologize, but I\'m having trouble connecting right now. Please try again or contact our support team at 9039012335.';
    }
  }

  /**
   * Get fallback response when API is not available
   */
  private getFallbackResponse(): string {
    return '🤖 Hi! I\'m currently in maintenance mode. For immediate assistance:\n\n📞 Call: 9039012335\n📧 Email: angoriyaarun311@gmail.com\n\nI can help you with:\n• Profile updates\n• Video uploads\n• Settings configuration\n• Account issues\n\nPlease describe your issue and I\'ll guide you through the solution!';
  }

  /**
   * Get authentication error response
   */
  private getAuthErrorResponse(): string {
    return '🔐 AI service authentication required. Our team is working on this!\n\nFor immediate help:\n📞 Call: 9039012335\n📧 Email: angoriyaarun311@gmail.com\n\nI apologize for the inconvenience. Please try again in a few minutes.';
  }

  /**
   * Get a quick response for common questions
   */
  async getQuickResponse(question: string): Promise<string> {
    const quickResponses: { [key: string]: string } = {
      'profile': '📝 To update your profile: Go to Profile tab > Edit Profile > Update your info > Save Changes. You can change your name, bio, photos, and more!',
      'upload': '📤 To upload content: Tap the + button > Choose Reel/Video/Photo > Select file > Add details > Upload. Make sure your content follows our community guidelines!',
      'settings': '⚙️ For settings: Go to Profile > Settings icon (top right) > Choose what you want to change. You can update privacy, notifications, and account preferences.',
      'privacy': '🔒 Privacy settings help: Profile > Settings > Privacy > Choose who can see your content. You can set posts to private, control who can message you, and more.',
      'support': '💜 Need more help? You can call us at 9039012335, email angoriyaarun311@gmail.com, or explore our FAQ section in the app.',
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, response] of Object.entries(quickResponses)) {
      if (lowerQuestion.includes(key)) {
        return response;
      }
    }

    // If no quick response, use AI
    return this.sendMessage([{ role: 'user', content: question }]);
  }

  /**
   * Check if API is configured and working
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      
      const testResponse = await this.sendMessage([
        { role: 'user', content: 'Hello, can you respond with just "OK"?' }
      ]);
      
      return testResponse.includes('OK');
    } catch (error) {
      console.error('Groq health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const groqAI = new GroqAIService();
export default groqAI;
