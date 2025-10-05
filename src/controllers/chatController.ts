import { Request, Response } from 'express';
import { OpenAIService } from '../services/openaiService';
import { StockAnalysisService } from '../services/stockAnalysisService';
import { QueryAnalysisService } from '../services/queryAnalysisService';
import { CONFIG } from '../config/constants';
import { SMART_CHAT_SYSTEM_PROMPT } from '../prompts/stockAnalysisPrompt';

export class ChatController {
  /**
   * Basic chat endpoint
   */
  static async chat(req: Request, res: Response) {
    try {
      const { message, model = CONFIG.DEFAULT_MODEL } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await OpenAIService.simpleChat(message, undefined, model);

      res.json({
        success: true,
        message: response.message,
        usage: response.usage
      });

    } catch (error: any) {
      console.error('ChatController.chat error:', error.message);
      res.status(500).json({
        error: 'Failed to process chat request',
        details: error.message
      });
    }
  }

  /**
   * Smart chat with AI-powered query analysis
   */
  static async smartChat(req: Request, res: Response) {
    try {
      const { message, model = CONFIG.DEFAULT_MODEL } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      console.log(`\n📨 Smart Chat Request: "${message}"`);

      // BƯỚC PHỤ: Sử dụng AI mini model để phân tích câu hỏi
      console.log(`🤖 Step 0: Analyzing query with ${CONFIG.MINI_MODEL}...`);
      const queryAnalysis = await QueryAnalysisService.analyzeQuery(message);
      
      console.log(`📊 Analysis result:`, {
        ticker: queryAnalysis.ticker,
        intent: queryAnalysis.intent,
        confidence: queryAnalysis.confidence
      });

      // Nếu phát hiện ý định phân tích cổ phiếu và có ticker
      if (
        queryAnalysis.ticker && 
        queryAnalysis.intent === 'stock_analysis' &&
        queryAnalysis.confidence >= 0.5
      ) {
        console.log(`✅ Stock analysis detected for: ${queryAnalysis.ticker}`);

        try {
          // Phân tích với 5 báo cáo được lọc theo thời gian
          const result = await StockAnalysisService.smartAnalyze(
            queryAnalysis.ticker,
            queryAnalysis.cleanedQuestion,
            model
          );

          return res.json({
            success: true,
            type: 'stock_analysis',
            ticker: queryAnalysis.ticker,
            message: result.analysis,
            queryAnalysis: {
              intent: queryAnalysis.intent,
              confidence: queryAnalysis.confidence
            },
            usage: result.usage
          });

        } catch (error: any) {
          console.log(`⚠️ Stock analysis failed: ${error.message}`);
          console.log('Falling back to normal chat...');
        }
      }

      // Fallback: Chat thông thường
      console.log(`💬 Processing as general chat...`);
      const response = await OpenAIService.simpleChat(
        message, 
        SMART_CHAT_SYSTEM_PROMPT, 
        model
      );

      res.json({
        success: true,
        type: 'general_chat',
        message: response.message,
        queryAnalysis: {
          intent: queryAnalysis.intent,
          confidence: queryAnalysis.confidence
        },
        usage: response.usage
      });

    } catch (error: any) {
      console.error('ChatController.smartChat error:', error.message);
      res.status(500).json({
        error: 'Failed to process smart chat request',
        details: error.message
      });
    }
  }
}

