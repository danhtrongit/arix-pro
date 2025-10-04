import axios from 'axios';
// @ts-ignore - pdf-parse doesn't have type definitions
import pdf from 'pdf-parse';
import { CONFIG } from '../config/constants';

export class PDFService {
  /**
   * Tải và đọc nội dung PDF từ URL
   */
  static async extractTextFromUrl(pdfUrl: string): Promise<string> {
    try {
      console.log(`Downloading PDF from: ${pdfUrl}`);
      
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: CONFIG.PDF_TIMEOUT
      });

      const pdfData = await pdf(response.data);
      const text = pdfData.text;

      console.log(`PDF extracted successfully. Length: ${text.length} characters`);
      
      return text;
    } catch (error: any) {
      console.error(`PDFService.extractTextFromUrl error for ${pdfUrl}:`, error.message);
      throw new Error(`Failed to extract PDF: ${error.message}`);
    }
  }

  /**
   * Tải và đọc nhiều PDF cùng lúc
   */
  static async extractMultiplePdfs(pdfUrls: string[]): Promise<string[]> {
    try {
      const promises = pdfUrls.map(url => this.extractTextFromUrl(url));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value.substring(0, CONFIG.MAX_PDF_TEXT_LENGTH);
        } else {
          console.error(`Failed to extract PDF ${index + 1}:`, result.reason);
          return `[Không thể đọc được nội dung báo cáo này]`;
        }
      });
    } catch (error: any) {
      console.error('PDFService.extractMultiplePdfs error:', error.message);
      throw error;
    }
  }
}

