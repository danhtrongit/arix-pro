import axios from 'axios';
import { CONFIG } from '../config/constants';

export interface FinancialDataPoint {
  text: string;
  section: string;
  ticker: string;
  year?: number;
  quarter?: number;
}

export interface RAGQueryResult {
  success: boolean;
  context: string;
  dataPoints: number;
  error?: string;
}

/**
 * Financial RAG Service - Query financial data from Qdrant vector database
 */
export class FinancialRAGService {
  private qdrantUrl: string;

  constructor() {
    this.qdrantUrl = `http://${CONFIG.QDRANT_HOST}:${CONFIG.QDRANT_PORT}`;
  }

  /**
   * Get embedding from OpenAI
   */
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        CONFIG.OPENAI_EMBEDDING_URL,
        {
          model: CONFIG.EMBEDDING_MODEL,
          input: text
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data[0].embedding;
    } catch (error: any) {
      console.error('Error getting embedding:', error.message);
      throw error;
    }
  }

  /**
   * Extract period (year, quarter) from text
   */
  private extractPeriod(text: string): { year: number; quarter: number } {
    const match = text.match(/\(Q(\d+)\/(\d+)\)/);
    if (match) {
      return {
        quarter: parseInt(match[1]),
        year: parseInt(match[2])
      };
    }
    return { year: 0, quarter: 0 };
  }

  /**
   * Query financial data from Qdrant
   */
  async queryFinancials(ticker: string, question?: string): Promise<RAGQueryResult> {
    try {
      console.log(`📊 RAG: Querying financial data for ${ticker}...`);

      // Check if Qdrant is available
      try {
        await axios.get(`${this.qdrantUrl}/collections/${CONFIG.QDRANT_COLLECTION}`);
      } catch (error) {
        console.log('⚠️  Qdrant not available, skipping financial data');
        return {
          success: false,
          context: '',
          dataPoints: 0,
          error: 'Qdrant not available'
        };
      }

      // Detect query intent
      const isLatestRequest = question ? /mới nhất|gần đây|hiện tại|năm nay|latest|recent|current/.test(question.toLowerCase()) : true;
      const isAnnualRequest = question ? /năm|year|annual|hàng năm|yearly/.test(question.toLowerCase()) : false;
      const isQuarterlyRequest = question ? /quý|quarter|quarterly/.test(question.toLowerCase()) : false;

      console.log(`📋 RAG Intent: latest=${isLatestRequest}, annual=${isAnnualRequest}, quarterly=${isQuarterlyRequest}`);

      let points: any[] = [];

      if (isLatestRequest) {
        // Get all statistics-financial points for this ticker
        const scrollResponse = await axios.post(
          `${this.qdrantUrl}/collections/${CONFIG.QDRANT_COLLECTION}/points/scroll`,
          {
            filter: {
              must: [
                { key: 'ticker', match: { value: ticker } },
                { key: 'section', match: { value: 'statistics-financial' } }
              ]
            },
            limit: 50,
            with_payload: true,
            with_vector: false
          }
        );

        const allPoints = scrollResponse.data.result.points;
        
        // Sort by period (newest first)
        const sortedPoints = allPoints.sort((a: any, b: any) => {
          const periodA = this.extractPeriod(a.payload.text);
          const periodB = this.extractPeriod(b.payload.text);
          
          if (periodA.year !== periodB.year) {
            return periodB.year - periodA.year;
          }
          return periodB.quarter - periodA.quarter;
        });

        // Filter based on query type
        if (isAnnualRequest) {
          // Get annual data (Q5)
          points = sortedPoints.filter((p: any) => p.payload.text.includes('Q5/')).slice(0, 5);
          console.log(`📅 RAG Data: Annual (Q5) - ${points.length} years`);
        } else if (isQuarterlyRequest) {
          // Get quarterly data (Q1-Q4)
          points = sortedPoints.filter((p: any) => !p.payload.text.includes('Q5/')).slice(0, 8);
          console.log(`📅 RAG Data: Quarterly (Q1-Q4) - ${points.length} quarters`);
        } else {
          // Mixed: 3 years + 6 quarters
          const annualPoints = sortedPoints.filter((p: any) => p.payload.text.includes('Q5/')).slice(0, 3);
          const quarterlyPoints = sortedPoints.filter((p: any) => !p.payload.text.includes('Q5/')).slice(0, 6);
          points = [...annualPoints, ...quarterlyPoints];
          console.log(`📅 RAG Data: Mixed - ${annualPoints.length} years + ${quarterlyPoints.length} quarters`);
        }
      } else if (question) {
        // Semantic search
        const embedding = await this.getEmbedding(question);
        
        const searchResponse = await axios.post(
          `${this.qdrantUrl}/collections/${CONFIG.QDRANT_COLLECTION}/points/search`,
          {
            vector: embedding,
            filter: {
              must: [
                { key: 'ticker', match: { value: ticker } }
              ]
            },
            limit: 15,
            with_payload: true
          }
        );

        points = searchResponse.data.result;
        console.log(`📊 RAG Data: Semantic search - ${points.length} points`);
      }

      // Build context
      const context = points.map((p: any, i: number) => {
        const period = this.extractPeriod(p.payload.text);
        return `[Dữ liệu ${i + 1}${period.year ? ` - Q${period.quarter}/${period.year}` : ''}]\n${p.payload.text}`;
      }).join('\n\n');

      console.log(`✅ RAG: Retrieved ${points.length} data points`);

      return {
        success: true,
        context,
        dataPoints: points.length
      };

    } catch (error: any) {
      console.error('Error querying financials:', error.message);
      return {
        success: false,
        context: '',
        dataPoints: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if Qdrant is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.qdrantUrl}/collections`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

