import { SimplizeService, SimplizeReport } from './simplizeService';
import { PDFService } from './pdfService';
import { OpenAIService } from './openaiService';
import { PriceDataService } from './priceDataService';
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
            content: userPrompt + '\n\nLƯU Ý QUAN TRỌNG:\n- CHỈ phân tích những gì có trong báo cáo\n- KHÔNG bịa đặt thông tin\n- Độ dài: 500-700 từ\n- Tập trung vào các ý CHÍNH'
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

      // Tạo context tổng hợp CHI TIẾT từ 5 báo cáo
      console.log(`Step 3: Building comprehensive analysis context...`);
      const systemPrompt = `Bạn là chuyên gia phân tích chứng khoán Việt Nam. 
Bạn vừa đọc ${reports.length} báo cáo phân tích gần nhất (trong vòng 60 ngày) về mã ${ticker}.
Hãy trả lời câu hỏi dựa trên tổng hợp các báo cáo này.

YÊU CẦU QUAN TRỌNG:
- CHỈ nêu những gì có trong báo cáo, không bịa đặt
- Tập trung vào: Kết quả KD, triển vọng, định giá, khuyến nghị
- So sánh quan điểm các báo cáo (nếu khác nhau)
- Độ dài: 500-700 từ (ngắn gọn, súc tích)
- Sử dụng Markdown, emoji để dễ đọc

Lưu ý: Tất cả thông tin xem như từ IQX tổng hợp, không nhắc nguồn cụ thể.`;

      let context = `# TỔNG HỢP ${reports.length} BÁO CÁO PHÂN TÍCH GẦN NHẤT VỀ ${ticker}\n\n`;
      
      // Tổng hợp thông tin tổng quan
      context += `## 📊 Thông tin tổng quan\n`;
      context += `- Tổng số báo cáo phân tích: ${reports.length}\n`;
      const buyCount = reports.filter(r => r.recommend.includes('MUA')).length;
      const holdCount = reports.filter(r => r.recommend.includes('GIỮ') || r.recommend.includes('LẬP')).length;
      const sellCount = reports.filter(r => r.recommend.includes('BÁN')).length;
      context += `- Khuyến nghị: MUA (${buyCount}), NẮM GIỮ (${holdCount}), BÁN (${sellCount})\n`;
      
      const avgPrice = reports
        .filter(r => r.targetPrice)
        .reduce((sum, r) => sum + (r.targetPrice || 0), 0) / 
        reports.filter(r => r.targetPrice).length;
      if (avgPrice) {
        context += `- Giá mục tiêu trung bình: ${Math.round(avgPrice).toLocaleString()} VNĐ\n`;
      }
      context += `\n${'='.repeat(80)}\n\n`;
      
      // Chi tiết từng báo cáo với nhiều nội dung hơn
      reports.forEach((report, index) => {
        context += `## 📄 Báo cáo ${index + 1}\n`;
        context += `- **Tiêu đề:** ${report.title}\n`;
        context += `- **Ngày phát hành:** ${report.issueDate}\n`;
        context += `- **Khuyến nghị:** ${report.recommend}\n`;
        context += `- **Giá mục tiêu:** ${report.targetPrice ? report.targetPrice.toLocaleString() + ' VNĐ' : 'N/A'}\n\n`;
        context += `### Nội dung chi tiết:\n${pdfContents[index].substring(0, 8000)}\n\n`;
        context += `${'='.repeat(80)}\n\n`;
      });

      context += `\n**Câu hỏi của người dùng:** ${userQuestion}\n\n`;
      context += `**YÊU CẦU:** CHỈ phân tích những gì có trong báo cáo. Không bịa thêm. Độ dài: 500-700 từ.`;

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

