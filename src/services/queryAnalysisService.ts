import { OpenAIService } from './openaiService';
import { CONFIG } from '../config/constants';

export interface QueryAnalysisResult {
  ticker: string | null;
  intent: 'stock_analysis' | 'general_question' | 'unclear';
  cleanedQuestion: string;
  confidence: number;
}

export class QueryAnalysisService {
  /**
   * Sử dụng AI mini model để phân tích câu hỏi và extract ticker
   */
  static async analyzeQuery(userMessage: string): Promise<QueryAnalysisResult> {
    try {
      const systemPrompt = `Bạn là một AI phân tích câu hỏi về chứng khoán.
Nhiệm vụ: Phân tích câu hỏi của user và trả về JSON với format sau:

{
  "ticker": "MÃ_CỔ_PHIẾU" hoặc null (nếu không tìm thấy),
  "intent": "stock_analysis" | "general_question" | "unclear",
  "cleanedQuestion": "Câu hỏi đã được làm sạch, bỏ mã cổ phiếu",
  "confidence": 0.0-1.0
}

Quy tắc:
1. Mã cổ phiếu VN thường là 3 ký tự viết hoa (VIC, VNM, HPG, FPT, VCB, TCB, MWG, etc.)
2. Intent "stock_analysis" nếu user hỏi về phân tích, đánh giá, thông tin, triển vọng cổ phiếu
3. Intent "general_question" nếu user hỏi về kiến thức chung (P/E là gì, EBITDA, etc.)
4. Intent "unclear" nếu không rõ ý định
5. cleanedQuestion: Câu hỏi gốc nhưng bỏ mã cổ phiếu (nếu có)

Ví dụ:
Input: "Phân tích cổ phiếu VIC cho tôi"
Output: {"ticker": "VIC", "intent": "stock_analysis", "cleanedQuestion": "Phân tích cổ phiếu cho tôi", "confidence": 0.95}

Input: "VNM thế nào?"
Output: {"ticker": "VNM", "intent": "stock_analysis", "cleanedQuestion": "thế nào?", "confidence": 0.9}

Input: "P/E ratio là gì?"
Output: {"ticker": null, "intent": "general_question", "cleanedQuestion": "P/E ratio là gì?", "confidence": 0.95}

Input: "Cho tôi xem thông tin về HPG"
Output: {"ticker": "HPG", "intent": "stock_analysis", "cleanedQuestion": "Cho tôi xem thông tin", "confidence": 0.9}

CHỈ TRẢ VỀ JSON, KHÔNG GHI GÌ THÊM.`;

      const response = await OpenAIService.simpleChat(
        userMessage,
        systemPrompt,
        CONFIG.MINI_MODEL
      );

      // Parse JSON response
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('Failed to parse AI response, using fallback');
        return this.fallbackAnalysis(userMessage);
      }

      const result = JSON.parse(jsonMatch[0]);
      
      console.log('✓ Query analyzed:', result);
      
      return {
        ticker: result.ticker ? result.ticker.toUpperCase() : null,
        intent: result.intent || 'unclear',
        cleanedQuestion: result.cleanedQuestion || userMessage,
        confidence: result.confidence || 0.5
      };

    } catch (error: any) {
      console.error('QueryAnalysisService error:', error.message);
      return this.fallbackAnalysis(userMessage);
    }
  }

  /**
   * Fallback analysis using regex when AI fails
   */
  private static fallbackAnalysis(message: string): QueryAnalysisResult {
    const tickerRegex = /\b([A-Z]{3})\b/;
    const match = message.match(tickerRegex);
    
    const analysisKeywords = [
      'phân tích', 'báo cáo', 'đánh giá', 'thế nào', 'như thế nào',
      'thông tin', 'có nên mua', 'có nên bán', 'triển vọng',
      'dự báo', 'khuyến nghị', 'giá mục tiêu'
    ];
    
    const hasAnalysisIntent = analysisKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );

    if (match && hasAnalysisIntent) {
      return {
        ticker: match[1],
        intent: 'stock_analysis',
        cleanedQuestion: message.replace(match[1], '').trim(),
        confidence: 0.7
      };
    }

    return {
      ticker: null,
      intent: 'general_question',
      cleanedQuestion: message,
      confidence: 0.6
    };
  }
}

