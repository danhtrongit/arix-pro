import axios from 'axios';

export interface OHLCData {
  symbol: string;
  o: number[]; // Open prices
  h: number[]; // High prices
  l: number[]; // Low prices
  c: number[]; // Close prices
  v: number[]; // Volumes
  t: string[]; // Timestamps
  accumulatedVolume: number[];
  accumulatedValue: number[];
  minBatchTruncTime: string;
}

export interface PriceDataSummary {
  symbol: string;
  latestPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highestPrice: number;
  lowestPrice: number;
  totalVolume: number;
  averageVolume: number;
  priceRange: string;
  trend: string;
  dataPoints: number;
}

export class PriceDataService {
  private static readonly API_URL = 'https://proxy.iqx.vn/proxy/trading/api/chart/OHLCChart/gap-chart';

  /**
   * Lấy dữ liệu OHLC từ IQX API
   * @param symbols Mảng mã cổ phiếu
   * @param countBack Số điểm dữ liệu (mặc định: số symbol * 60)
   * @returns Mảng dữ liệu OHLC
   */
  static async getOHLCData(
    symbols: string[],
    countBack?: number
  ): Promise<OHLCData[]> {
    try {
      // Tính timestamp 7h sáng hôm nay
      const now = new Date();
      const today7AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
      const toTimestamp = Math.floor(today7AM.getTime() / 1000);

      // Nếu không có countBack, tính theo số symbol * 60
      const finalCountBack = countBack || symbols.length * 60;

      const requestBody = {
        timeFrame: 'ONE_DAY',
        symbols: symbols,
        to: toTimestamp,
        countBack: finalCountBack
      };

      console.log(`📈 Fetching price data for ${symbols.join(', ')}...`);
      console.log(`   Request:`, JSON.stringify(requestBody, null, 2));

      const response = await axios.post<OHLCData[]>(this.API_URL, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✓ Received price data for ${response.data.length} symbols`);
      return response.data;

    } catch (error: any) {
      console.error('PriceDataService.getOHLCData error:', error.message);
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }
  }

  /**
   * Phân tích và tóm tắt dữ liệu giá
   */
  static analyzePriceData(ohlcData: OHLCData): PriceDataSummary {
    const { symbol, o, h, l, c, v, t } = ohlcData;

    if (c.length === 0) {
      throw new Error(`No price data available for ${symbol}`);
    }

    // Giá mới nhất
    const latestPrice = c[c.length - 1];
    const oldestPrice = c[0];

    // Thay đổi giá
    const priceChange = latestPrice - oldestPrice;
    const priceChangePercent = (priceChange / oldestPrice) * 100;

    // Giá cao nhất và thấp nhất
    const highestPrice = Math.max(...h);
    const lowestPrice = Math.min(...l);

    // Tổng và trung bình volume
    const totalVolume = v.reduce((sum, vol) => sum + vol, 0);
    const averageVolume = totalVolume / v.length;

    // Xu hướng
    let trend = 'Sideway';
    if (priceChangePercent > 2) trend = 'Tăng mạnh';
    else if (priceChangePercent > 0.5) trend = 'Tăng nhẹ';
    else if (priceChangePercent < -2) trend = 'Giảm mạnh';
    else if (priceChangePercent < -0.5) trend = 'Giảm nhẹ';

    return {
      symbol,
      latestPrice,
      priceChange,
      priceChangePercent,
      highestPrice,
      lowestPrice,
      totalVolume,
      averageVolume,
      priceRange: `${lowestPrice.toLocaleString()} - ${highestPrice.toLocaleString()}`,
      trend,
      dataPoints: c.length
    };
  }

  /**
   * Tạo text mô tả dữ liệu giá cho AI
   */
  static formatPriceDataForAnalysis(ohlcData: OHLCData): string {
    const summary = this.analyzePriceData(ohlcData);
    const { symbol, o, h, l, c, v, t } = ohlcData;

    let text = `## 📊 DỮ LIỆU GIÁ CỔ PHIẾU ${symbol}\n\n`;
    
    // Thông tin tóm tắt
    text += `### Tóm tắt (${summary.dataPoints} ngày giao dịch gần nhất)\n`;
    text += `- **Giá hiện tại:** ${summary.latestPrice.toLocaleString()} VNĐ\n`;
    text += `- **Thay đổi:** ${summary.priceChange > 0 ? '+' : ''}${summary.priceChange.toLocaleString()} VNĐ (${summary.priceChangePercent > 0 ? '+' : ''}${summary.priceChangePercent.toFixed(2)}%)\n`;
    text += `- **Xu hướng:** ${summary.trend}\n`;
    text += `- **Biên độ giá:** ${summary.priceRange} VNĐ\n`;
    text += `- **Giá cao nhất:** ${summary.highestPrice.toLocaleString()} VNĐ\n`;
    text += `- **Giá thấp nhất:** ${summary.lowestPrice.toLocaleString()} VNĐ\n`;
    text += `- **Volume trung bình:** ${Math.round(summary.averageVolume).toLocaleString()} CP\n`;
    text += `- **Tổng volume:** ${Math.round(summary.totalVolume).toLocaleString()} CP\n\n`;

    // Chi tiết từng ngày (5 ngày gần nhất)
    const recentDays = Math.min(5, c.length);
    text += `### Chi tiết ${recentDays} phiên giao dịch gần nhất\n`;
    text += `| Ngày | Mở cửa | Cao nhất | Thấp nhất | Đóng cửa | Thay đổi | Volume |\n`;
    text += `|------|--------|----------|-----------|----------|----------|--------|\n`;

    for (let i = c.length - recentDays; i < c.length; i++) {
      const date = new Date(parseInt(t[i]) * 1000).toLocaleDateString('vi-VN');
      const change = i > 0 ? c[i] - c[i - 1] : 0;
      const changePercent = i > 0 ? ((change / c[i - 1]) * 100).toFixed(2) : '0.00';
      const changeStr = change > 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
      
      text += `| ${date} | ${o[i].toLocaleString()} | ${h[i].toLocaleString()} | ${l[i].toLocaleString()} | ${c[i].toLocaleString()} | ${changeStr} (${changePercent}%) | ${v[i].toLocaleString()} |\n`;
    }

    text += `\n`;

    return text;
  }

  /**
   * Lấy và format dữ liệu giá cho nhiều mã cổ phiếu
   */
  static async getPriceDataForAnalysis(symbols: string[]): Promise<string> {
    try {
      const ohlcDataArray = await this.getOHLCData(symbols);
      
      let combinedText = `# 📈 DỮ LIỆU GIÁ THỊ TRƯỜNG\n\n`;
      
      ohlcDataArray.forEach(ohlcData => {
        combinedText += this.formatPriceDataForAnalysis(ohlcData);
        combinedText += `\n${'='.repeat(80)}\n\n`;
      });

      return combinedText;

    } catch (error: any) {
      console.error('Error getting price data for analysis:', error.message);
      return `⚠️ Không thể lấy dữ liệu giá: ${error.message}\n\n`;
    }
  }
}

