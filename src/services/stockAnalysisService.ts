import { SimplizeService, SimplizeReport } from './simplizeService';
import { PDFService } from './pdfService';
import { OpenAIService } from './openaiService';
import { PriceDataService } from './priceDataService';
import { FinancialRAGService } from './financialRAGService';
import { STOCK_ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../prompts/stockAnalysisPrompt';
import { CONFIG } from '../config/constants';

export interface StockAnalysisResult {
  success: true;
  ticker: string;
  analysis: string;
  reports: SimplizeReport[];
  totalReports: number;
  usage?: any;
}

export class StockAnalysisService {
  /**
   * Phân tích tổng hợp cổ phiếu từ nhiều báo cáo
   */
  static async analyzeStock(
    ticker: string,
    numberOfReports: number = CONFIG.MAX_REPORTS_TO_ANALYZE,
    model?: string
  ): Promise<StockAnalysisResult> {
    try {
      console.log(`\n=== Starting stock analysis for ${ticker} ===`);
      
      // Bước 1: Lấy báo cáo từ Simplize
      console.log(`Step 1: Fetching ${numberOfReports} latest reports...`);
      const reports = await SimplizeService.getLatestReports(ticker, numberOfReports);
      console.log(`✓ Found ${reports.length} reports`);

      // Bước 2: Tải và đọc tất cả PDF
      console.log(`Step 2: Downloading and extracting ${reports.length} PDFs...`);
      const pdfUrls = reports.map(report => report.attachedLink);
      const pdfContents = await PDFService.extractMultiplePdfs(pdfUrls);
      console.log(`✓ Extracted ${pdfContents.length} PDFs`);

      // Bước 3: Tạo prompt tổng hợp CHI TIẾT
      console.log(`Step 3: Building comprehensive analysis prompt...`);
      const userPrompt = buildAnalysisUserPrompt(ticker, reports, pdfContents);
      console.log(`✓ Prompt length: ${userPrompt.length} characters`);

      // Bước 4: Gửi tới AI để phân tích CHI TIẾT
      console.log(`Step 4: Sending to AI for detailed analysis (max ${CONFIG.MAX_TOKENS} tokens)...`);
      const aiResponse = await OpenAIService.chatCompletion(
        [
          {
            role: 'system',
            content: STOCK_ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: userPrompt + '\n\nLƯU Ý QUAN TRỌNG:\n- Phân tích dựa trên dữ liệu thực tế\n- KHÔNG bịa đặt thông tin\n- KHÔNG nhắc đến nguồn hoặc số lượng tài liệu\n- Độ dài: 500-700 từ\n- Tập trung vào các ý chính'
          }
        ],
        model,
        {
          temperature: CONFIG.TEMPERATURE,
          max_tokens: CONFIG.MAX_TOKENS
        }
      );
      console.log(`✓ AI analysis completed`);
      console.log(`=== Comprehensive analysis completed for ${ticker} ===\n`);

      return {
        success: true,
        ticker: ticker.toUpperCase(),
        analysis: aiResponse.message,
        reports: reports,
        totalReports: reports.length,
        usage: aiResponse.usage
      };

    } catch (error: any) {
      console.error('StockAnalysisService.analyzeStock error:', error.message);
      throw error;
    }
  }

  /**
   * Phân tích cho smart chat với 5 báo cáo được lọc theo thời gian
   */
  static async smartAnalyze(
    ticker: string,
    userQuestion: string,
    model?: string
  ): Promise<{ analysis: string; reports: any[]; totalReports: number; usage?: any }> {
    try {
      console.log(`\n=== Smart analysis for ${ticker} ===`);
      
      // Lấy 5 báo cáo gần nhất và lọc theo thời gian (60 ngày)
      console.log(`Step 1: Fetching 5 latest reports (within ${CONFIG.MAX_REPORT_AGE_DAYS} days)...`);
      const reports = await SimplizeService.getValidReports(ticker, 5, CONFIG.MAX_REPORT_AGE_DAYS);
      console.log(`✓ Found ${reports.length} valid reports`);

      // Lấy dữ liệu giá từ IQX
      console.log(`Step 1.5: Fetching price data from IQX...`);
      let priceDataText = '';
      try {
        priceDataText = await PriceDataService.getPriceDataForAnalysis([ticker]);
        console.log(`✓ Price data fetched successfully`);
      } catch (error: any) {
        console.log(`⚠️ Could not fetch price data: ${error.message}`);
        priceDataText = `⚠️ Dữ liệu giá không khả dụng\n\n`;
      }

      // Tải và đọc tất cả PDF
      console.log(`Step 2: Downloading and extracting ${reports.length} PDFs...`);
      const pdfUrls = reports.map(report => report.attachedLink);
      const pdfContents = await PDFService.extractMultiplePdfs(pdfUrls);
      console.log(`✓ Extracted ${pdfContents.length} PDFs`);

      // Tạo context tổng hợp CHI TIẾT
      console.log(`Step 3: Building comprehensive analysis context...`);
      
      // Query financial data from RAG (nếu có)
      const ragService = new FinancialRAGService();
      const ragResult = await ragService.queryFinancials(ticker, userQuestion);
      
      const systemPrompt = `Bạn là Arix Pro - Phiên bản AI Pro phân tích chứng khoán của IQX. 
Bạn có đầy đủ thông tin phân tích về mã ${ticker}, bao gồm dữ liệu giá giao dịch gần đây.
Hãy trả lời câu hỏi một cách tự nhiên và chuyên nghiệp.

⚠️ LƯU Ý VỀ NĂM HIỆN TẠI: ${CONFIG.CURRENT_YEAR} (Quý ${CONFIG.CURRENT_QUARTER})

YÊU CẦU QUAN TRỌNG:
- **BẮT BUỘC** phân tích dựa vào dữ liệu từ các file PDF (phân tích từ các công ty chứng khoán)
- Dữ liệu báo cáo tài chính CHỈ để tham khảo thêm, KHÔNG phải nguồn chính
- Luôn sử dụng dữ liệu MỚI NHẤT có trong phân tích (năm ${CONFIG.CURRENT_YEAR})
- Tập trung vào: Kết quả kinh doanh, triển vọng, định giá, khuyến nghị
- Phân tích xu hướng giá gần đây
- So sánh các quan điểm khác nhau (nếu có)
- Độ dài: 500-700 từ (ngắn gọn, súc tích)
- Sử dụng markdown, emoji để dễ đọc
- KHÔNG nhắc đến số lượng dữ liệu, nguồn, hoặc tài liệu tham khảo

Trình bày tự nhiên như một chuyên gia chia sẻ quan điểm.`;

      let context = '';
      
      // Thêm dữ liệu giá vào đầu context
      context += priceDataText;
      
      context += `# Phân tích cổ phiếu ${ticker} (${CONFIG.CURRENT_YEAR})\n\n`;
      
      context += `## 🎯 NGUỒN DỮ LIỆU CHÍNH: Phân tích từ các công ty chứng khoán (PDF)\n\n`;
      
      // Tổng hợp thông tin tổng quan
      context += `## 📊 Tổng quan đánh giá\n`;
      const buyCount = reports.filter(r => r.recommend.includes('MUA')).length;
      const holdCount = reports.filter(r => r.recommend.includes('GIỮ') || r.recommend.includes('LẬP')).length;
      const sellCount = reports.filter(r => r.recommend.includes('BÁN')).length;
      context += `- Các đánh giá: Mua (${buyCount}), Nắm giữ (${holdCount}), Bán (${sellCount})\n`;
      
      const avgPrice = reports
        .filter(r => r.targetPrice)
        .reduce((sum, r) => sum + (r.targetPrice || 0), 0) / 
        reports.filter(r => r.targetPrice).length;
      if (avgPrice) {
        context += `- Giá mục tiêu ước tính: ${Math.round(avgPrice).toLocaleString()} VNĐ\n`;
      }
      context += `\n${'='.repeat(80)}\n\n`;
      
      // Chi tiết từng phân tích (NGUỒN CHÍNH)
      reports.forEach((report, index) => {
        context += `## 📄 Phân tích ${index + 1} [NGUỒN CHÍNH]\n`;
        context += `- **Tiêu đề:** ${report.title}\n`;
        context += `- **Ngày:** ${report.issueDate}\n`;
        context += `- **Đánh giá:** ${report.recommend}\n`;
        context += `- **Giá mục tiêu:** ${report.targetPrice ? report.targetPrice.toLocaleString() + ' VNĐ' : 'N/A'}\n\n`;
        context += `### Nội dung:\n${pdfContents[index].substring(0, 8000)}\n\n`;
        context += `${'='.repeat(80)}\n\n`;
      });

      // Thêm dữ liệu tài chính từ RAG (nếu có) - CHỈ THAM KHẢO
      if (ragResult.success && ragResult.context) {
        context += `\n## 📑 Dữ liệu báo cáo tài chính [CHỈ THAM KHẢO]\n\n`;
        context += ragResult.context;
        context += `\n\n${'='.repeat(80)}\n\n`;
        console.log(`✅ Added financial data: ${ragResult.dataPoints} points`);
      }

      context += `\n**Câu hỏi:** ${userQuestion}\n\n`;
      context += `**LƯU Ý QUAN TRỌNG:**\n`;
      context += `- Phân tích BẮT BUỘC dựa vào nội dung PDF từ các công ty chứng khoán\n`;
      context += `- Báo cáo tài chính CHỈ để tham khảo thêm\n`;
      context += `- Luôn ưu tiên dữ liệu MỚI NHẤT (năm ${CONFIG.CURRENT_YEAR})\n`;
      context += `- Độ dài: 500-700 từ\n`;
      context += `- Không bịa đặt, không nhắc nguồn`;

      console.log(`✓ Context length: ${context.length} characters`);

      // Gửi tới AI để phân tích CHI TIẾT
      console.log(`Step 4: Sending to AI for detailed analysis (max ${CONFIG.MAX_TOKENS} tokens)...`);
      const aiResponse = await OpenAIService.simpleChat(context, systemPrompt, model);
      console.log(`✓ AI analysis completed`);
      console.log(`=== Smart analysis completed for ${ticker} ===\n`);

      return {
        analysis: aiResponse.message,
        reports: reports.map(r => ({
          title: r.title,
          source: r.source,
          issueDate: r.issueDate,
          recommend: r.recommend,
          targetPrice: r.targetPrice,
          pdfLink: r.attachedLink
        })),
        totalReports: reports.length,
        usage: aiResponse.usage
      };

    } catch (error: any) {
      console.error('StockAnalysisService.smartAnalyze error:', error.message);
      throw error;
    }
  }
}

