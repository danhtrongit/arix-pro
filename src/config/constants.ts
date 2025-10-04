import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 5999,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_API_URL: 'https://v98store.com/v1/chat/completions',
  DEFAULT_MODEL: 'gpt-5-chat-latest',
  MINI_MODEL: 'gpt-5-mini-2025-08-07',
  SIMPLIZE_API_URL: 'https://api2.simplize.vn/api/company/analysis-report/list',
  PRICE_DATA_API_URL: 'https://proxy.iqx.vn/proxy/trading/api/chart/OHLCChart/gap-chart',
  MAX_REPORTS_TO_ANALYZE: 5,
  MAX_REPORT_AGE_DAYS: 60,
  PDF_TIMEOUT: 30000,
  MAX_PDF_TEXT_LENGTH: 50000, // Đọc đủ nội dung để phân tích
  MAX_TOKENS: 2500, // Điều chỉnh cho response 800-1000 từ
  TEMPERATURE: 0.7,
};

