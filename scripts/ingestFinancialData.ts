#!/usr/bin/env ts-node
/**
 * Script to ingest financial data into Qdrant Vector Database
 * 
 * Usage:
 *   npx ts-node scripts/ingestFinancialData.ts VIC
 *   npx ts-node scripts/ingestFinancialData.ts HPG FPT VIC
 */

import axios from 'axios';
import { CONFIG } from '../src/config/constants';

const QDRANT_URL = `http://${CONFIG.QDRANT_HOST}:${CONFIG.QDRANT_PORT}`;

// Get embedding from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
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
    console.error('❌ Error getting embedding:', error.message);
    throw error;
  }
}

// Fetch company data from IQX API
async function fetchCompanyData(ticker: string) {
  const base = `https://proxy.iqx.vn/proxy/trading/api/iq-insight-service/v1/company/${ticker}`;
  const sections = [
    'financial-statement?section=CASH_FLOW',
    'financial-statement?section=INCOME_STATEMENT',
    'financial-statement?section=BALANCE_SHEET',
    'statistics-financial',
  ];

  const dataBlocks: any[] = [];

  for (const section of sections) {
    const url = `${base}/${section}`;
    console.log(`🔹 Fetching ${url}`);
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        dataBlocks.push({ section, content: response.data });
      }
    } catch (error: any) {
      console.log(`⚠️  Lỗi khi fetch ${section}: ${error.message}`);
    }
  }

  return dataBlocks;
}

// Extract period from text
function extractPeriod(text: string): { year: number; quarter: number } {
  const match = text.match(/\(Q(\d+)\/(\d+)\)/);
  if (match) {
    return {
      quarter: parseInt(match[1]),
      year: parseInt(match[2])
    };
  }
  return { year: 0, quarter: 0 };
}

// Flatten JSON to text
function flattenJsonToText(section: string, data: any): string[] {
  const texts: string[] = [];
  
  if (!data || !data.data) {
    return texts;
  }

  const rawData = data.data;

  // Case 1: statistics-financial (array)
  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      const year = item.year || '';
      const quarter = item.quarter || '';
      const period = quarter && year ? `Q${quarter}/${year}` : year ? `${year}` : '';

      const keyMetrics: string[] = [];
      const importantFields = [
        'marketCap', 'pe', 'pb', 'ps', 'roe', 'roa', 'eps', 'bvps',
        'grossMargin', 'ebitMargin', 'afterTaxProfitMargin',
        'currentRatio', 'quickRatio', 'debtPerEquity', 'debtToEquity',
        'revenue', 'grossProfit', 'netProfit', 'totalAssets', 'totalEquity'
      ];

      for (const key of importantFields) {
        const value = item[key];
        if (value !== null && value !== undefined && value !== '') {
          keyMetrics.push(`${key}: ${value}`);
        }
      }

      if (keyMetrics.length > 0 && period) {
        const line = `${section} (${period})\n${keyMetrics.join('\n')}`;
        texts.push(line);
      }
    }
  }
  // Case 2: financial-statement (object)
  else if (typeof rawData === 'object') {
    if (rawData.years && Array.isArray(rawData.years)) {
      // Take last 3 years
      for (const yearData of rawData.years.slice(-3)) {
        const year = yearData.yearReport || '';
        if (!year) continue;

        const yearMetrics: string[] = [];
        const importantPrefixes = ['cfa', 'isa', 'bsa'];

        for (const [key, value] of Object.entries(yearData)) {
          if (value === null || value === '' || value === 0) continue;
          
          if (importantPrefixes.some(prefix => key.toLowerCase().startsWith(prefix))) {
            yearMetrics.push(`${key.toUpperCase()}: ${value}`);
          }
        }

        if (yearMetrics.length > 0) {
          const line = `${section} - Năm ${year}\n${yearMetrics.slice(0, 30).join('\n')}`;
          texts.push(line);
        }
      }
    }
  }

  return texts;
}

// Ingest data to Qdrant
async function ingestToQdrant(ticker: string, recreateCollection: boolean = true) {
  console.log(`\n📈 Đang lấy dữ liệu cho mã ${ticker}...`);

  // Check/Create collection
  try {
    const collectionExists = await axios.get(`${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}`);
    
    if (recreateCollection) {
      console.log(`🗑️  Xóa collection cũ: ${CONFIG.QDRANT_COLLECTION}`);
      await axios.delete(`${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}`);
    }
  } catch (error) {
    // Collection doesn't exist, will create it
  }

  // Create collection if needed
  try {
    await axios.get(`${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}`);
    console.log(`➕ Thêm dữ liệu vào collection hiện tại: ${CONFIG.QDRANT_COLLECTION}`);
  } catch (error) {
    console.log(`🆕 Tạo collection mới: ${CONFIG.QDRANT_COLLECTION}`);
    await axios.put(
      `${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}`,
      {
        vectors: {
          size: 3072,
          distance: 'Cosine'
        }
      }
    );
  }

  // Fetch data
  const dataBlocks = await fetchCompanyData(ticker);

  // Flatten to texts
  const allTexts: Array<{ text: string; section: string }> = [];
  for (const block of dataBlocks) {
    const texts = flattenJsonToText(block.section, block.content);
    for (const text of texts) {
      allTexts.push({ text, section: block.section });
    }
  }

  console.log(`🚀 Bắt đầu xử lý ${allTexts.length} điểm dữ liệu...`);

  // Get offset for multi-ticker
  let offsetId = 0;
  if (!recreateCollection) {
    try {
      const scrollResponse = await axios.post(
        `${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}/points/scroll`,
        {
          limit: 1,
          with_payload: false,
          with_vector: false
        }
      );
      
      if (scrollResponse.data.result.points.length > 0) {
        offsetId = Math.max(...scrollResponse.data.result.points.map((p: any) => p.id)) + 1;
      }
    } catch (error) {
      offsetId = 0;
    }
  }

  // Process and create embeddings
  const points: any[] = [];
  for (let i = 0; i < allTexts.length; i++) {
    const item = allTexts[i];
    
    try {
      const embedding = await getEmbedding(item.text);
      
      points.push({
        id: offsetId + i,
        vector: embedding,
        payload: {
          ticker,
          text: item.text,
          section: item.section
        }
      });

      if ((i + 1) % 10 === 0) {
        console.log(`📊 Đã xử lý ${i + 1}/${allTexts.length} điểm dữ liệu...`);
      }
    } catch (error: any) {
      console.error(`❌ Lỗi khi xử lý điểm ${i}: ${error.message}`);
    }
  }

  // Upsert to Qdrant
  console.log(`💾 Đang ghi ${points.length} điểm vào Qdrant...`);
  await axios.put(
    `${QDRANT_URL}/collections/${CONFIG.QDRANT_COLLECTION}/points`,
    {
      points
    }
  );

  console.log(`✅ Đã nạp ${points.length} đoạn dữ liệu cho ${ticker}.\n`);
}

// Main
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 FINANCIAL DATA INGESTION SCRIPT');
  console.log('='.repeat(60));

  const tickers = process.argv.slice(2);

  if (tickers.length === 0) {
    console.log('\n❌ Sử dụng: npx ts-node scripts/ingestFinancialData.ts <TICKER1> [TICKER2] ...');
    console.log('Ví dụ: npx ts-node scripts/ingestFinancialData.ts VIC');
    console.log('Ví dụ: npx ts-node scripts/ingestFinancialData.ts VIC HPG FPT\n');
    process.exit(1);
  }

  console.log(`\n📋 Danh sách mã cổ phiếu: ${tickers.join(', ')}`);
  console.log(`🔧 Qdrant: ${CONFIG.QDRANT_HOST}:${CONFIG.QDRANT_PORT}`);
  console.log(`📦 Collection: ${CONFIG.QDRANT_COLLECTION}\n`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i].toUpperCase();
    console.log('\n' + '='.repeat(60));
    console.log(`[${i + 1}/${tickers.length}] Processing ${ticker}`);
    console.log('='.repeat(60));

    const recreate = i === 0;
    await ingestToQdrant(ticker, recreate);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ HOÀN TẤT TẤT CẢ!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

