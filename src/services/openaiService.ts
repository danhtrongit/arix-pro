import axios from 'axios';
import { CONFIG } from '../config/constants';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  /**
   * Gọi OpenAI Chat Completion API
   */
  static async chatCompletion(
    messages: ChatMessage[],
    model: string = CONFIG.DEFAULT_MODEL,
    options: {
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): Promise<ChatCompletionResponse> {
    try {
      if (!CONFIG.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      const response = await axios.post(
        CONFIG.OPENAI_API_URL,
        {
          model: model,
          messages: messages,
          temperature: options.temperature || CONFIG.TEMPERATURE,
          max_tokens: options.max_tokens || CONFIG.MAX_TOKENS,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
          }
        }
      );

      return {
        message: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('OpenAIService.chatCompletion error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  /**
   * Chat đơn giản với system prompt
   */
  static async simpleChat(
    userMessage: string,
    systemPrompt?: string,
    model?: string
  ): Promise<ChatCompletionResponse> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: userMessage
    });

    return this.chatCompletion(messages, model);
  }
}

