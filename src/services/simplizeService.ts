import axios from 'axios';
import { CONFIG } from '../config/constants';

export interface SimplizeReport {
  id: number;
  ticker: string;
  tickerName: string;
  reportType: number;
  source: string;
  issueDate: string;
  issueDateTimeAgo: string;
  title: string;
  attachedLink: string;
  fileName: string;
  targetPrice?: number;
  recommend: string;
}

export class SimplizeService {
  /**
   * Lấy danh sách báo cáo phân tích từ Simplize API
   */
  static async getReports(ticker: string, limit: number = 20): Promise<SimplizeReport[]> {
    try {
      const response = await axios.get(CONFIG.SIMPLIZE_API_URL, {
        params: {
          ticker: ticker.toUpperCase(),
          isWl: false,
          page: 0,
          size: limit
        }
      });

      const reports = response.data?.data;
      
      if (!reports || reports.length === 0) {
        throw new Error(`No reports found for ticker: ${ticker}`);
      }

      return reports;
    } catch (error: any) {
      console.error('SimplizeService.getReports error:', error.message);
      throw error;
    }
  }

  /**
   * Lấy N báo cáo mới nhất
   */
  static async getLatestReports(ticker: string, count: number = 5): Promise<SimplizeReport[]> {
    const allReports = await this.getReports(ticker, Math.max(count, 20));
    return allReports.slice(0, count);
  }

  /**
   * Lấy báo cáo mới nhất và lọc theo thời gian
   */
  static async getValidReports(
    ticker: string, 
    count: number = 5, 
    maxAgeDays: number = CONFIG.MAX_REPORT_AGE_DAYS
  ): Promise<SimplizeReport[]> {
    const allReports = await this.getReports(ticker, Math.max(count * 2, 20));
    
    // Lọc báo cáo theo thời gian
    const validReports = this.filterReportsByAge(allReports, maxAgeDays);
    
    if (validReports.length === 0) {
      throw new Error(`No reports found within ${maxAgeDays} days for ticker: ${ticker}`);
    }
    
    console.log(`✓ Found ${validReports.length} valid reports (within ${maxAgeDays} days)`);
    
    return validReports.slice(0, count);
  }

  /**
   * Lọc báo cáo theo độ tuổi (ngày)
   */
  private static filterReportsByAge(reports: SimplizeReport[], maxAgeDays: number): SimplizeReport[] {
    const now = new Date();
    
    return reports.filter(report => {
      const reportDate = this.parseVietnameseDate(report.issueDate);
      if (!reportDate) {
        console.warn(`Cannot parse date: ${report.issueDate}`);
        return false;
      }
      
      const ageInDays = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (ageInDays <= maxAgeDays) {
        console.log(`  ✓ Report "${report.title.substring(0, 50)}..." - ${ageInDays} days old`);
        return true;
      } else {
        console.log(`  ✗ Report too old (${ageInDays} days) - skipped`);
        return false;
      }
    });
  }

  /**
   * Parse ngày tháng định dạng Việt Nam (dd/MM/yyyy)
   */
  private static parseVietnameseDate(dateStr: string): Date | null {
    try {
      // Format: "05/09/2025" hoặc "5/9/2025"
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      return new Date(year, month, day);
    } catch (error) {
      return null;
    }
  }
}

