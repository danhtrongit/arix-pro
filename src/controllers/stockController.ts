import { Request, Response } from 'express';
import { StockAnalysisService } from '../services/stockAnalysisService';
import { CONFIG } from '../config/constants';

export class StockController {
  /**
   * Phân tích tổng hợp cổ phiếu
   */
  static async analyzeStock(req: Request, res: Response) {
    try {
      const { 
        ticker, 
        numberOfReports = CONFIG.MAX_REPORTS_TO_ANALYZE, 
        model = CONFIG.DEFAULT_MODEL 
      } = req.body;

      if (!ticker) {
        return res.status(400).json({ 
          error: 'Ticker is required',
          example: { ticker: 'VIC', numberOfReports: 5 }
        });
      }

      const result = await StockAnalysisService.analyzeStock(
        ticker, 
        numberOfReports, 
        model
      );

      res.json({
        success: true,
        ticker: result.ticker,
        analysis: result.analysis,
        reportsSummary: result.reports.map(r => ({
          title: r.title,
          source: r.source,
          issueDate: r.issueDate,
          recommend: r.recommend,
          targetPrice: r.targetPrice,
          pdfLink: r.attachedLink
        })),
        totalReportsAnalyzed: result.totalReports,
        usage: result.usage
      });

    } catch (error: any) {
      console.error('StockController.analyzeStock error:', error.message);
      res.status(500).json({
        error: 'Failed to analyze stock',
        details: error.message
      });
    }
  }
}

