# AriX API Documentation

## Tổng quan

AriX Stock Analysis API cung cấp dịch vụ phân tích cổ phiếu thông minh sử dụng AI. API tự động phát hiện ý định người dùng và phân tích báo cáo tài chính từ Simplize.

**Base URL:**
```
http://localhost:5999
```

**Content-Type:**
```
application/json
```

**CORS:** Enabled (cho phép tất cả origins)

---

## Endpoints

### 1. Health Check

Kiểm tra trạng thái hoạt động của server.

#### Request

```http
GET /api
```

#### Response

**Status:** `200 OK`

**Content-Type:** `text/html`

```
hello
```

#### Ví dụ

**cURL:**
```bash
curl http://localhost:5999/api
```

**JavaScript:**
```javascript
fetch('http://localhost:5999/api')
  .then(res => res.text())
  .then(data => console.log(data));
```

---

### 2. Smart Chat

Endpoint chính cho trò chuyện thông minh với khả năng tự động phân tích cổ phiếu.

#### Request

```http
POST /api/chat
```

#### Headers

```
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `message` | string | ✅ Yes | - | Câu hỏi hoặc yêu cầu từ người dùng |
| `model` | string | ❌ No | `gpt-5-chat-latest` | Model AI sử dụng để phân tích |

#### Request Example

```json
{
  "message": "Phân tích cổ phiếu VIC cho tôi",
  "model": "gpt-5-chat-latest"
}
```

---

## Response Types

API có thể trả về 2 loại response khác nhau tùy thuộc vào ý định được phát hiện:

### 2.1. Stock Analysis Response

Khi API phát hiện yêu cầu phân tích cổ phiếu.

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "success": true,
  "type": "stock_analysis",
  "ticker": "VIC",
  "message": "Phân tích chi tiết về cổ phiếu VIC dựa trên 5 báo cáo gần đây...",
  "reports": [
    {
      "title": "VIC - Vingroup: Bất động sản và bán lẻ tiếp tục tăng trưởng",
      "source": "VCBS",
      "issueDate": "2025-01-15",
      "recommend": "MUA",
      "targetPrice": "45000",
      "currentPrice": "42000",
      "upside": "7.14%",
      "content": "Nội dung tóm tắt báo cáo..."
    },
    {
      "title": "VIC - Update Q4/2024",
      "source": "SSI",
      "issueDate": "2025-01-10",
      "recommend": "MUA",
      "targetPrice": "46000",
      "currentPrice": "42000",
      "upside": "9.52%",
      "content": "Nội dung tóm tắt báo cáo..."
    }
  ],
  "totalReportsAnalyzed": 5,
  "queryAnalysis": {
    "intent": "stock_analysis",
    "confidence": 0.95
  },
  "usage": {
    "prompt_tokens": 15234,
    "completion_tokens": 1087,
    "total_tokens": 16321
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Trạng thái xử lý request |
| `type` | string | Loại response: `"stock_analysis"` |
| `ticker` | string | Mã cổ phiếu được phân tích |
| `message` | string | Phân tích chi tiết từ AI (500-700 từ) |
| `reports` | array | Danh sách các báo cáo đã phân tích |
| `reports[].title` | string | Tiêu đề báo cáo |
| `reports[].source` | string | Nguồn báo cáo (VCBS, SSI, HSC, etc.) |
| `reports[].issueDate` | string | Ngày phát hành báo cáo (YYYY-MM-DD) |
| `reports[].recommend` | string | Khuyến nghị (MUA, GIỮ, BÁN) |
| `reports[].targetPrice` | string | Giá mục tiêu |
| `reports[].currentPrice` | string | Giá hiện tại (nếu có) |
| `reports[].upside` | string | Tiềm năng tăng giá (%) |
| `reports[].content` | string | Nội dung tóm tắt báo cáo |
| `totalReportsAnalyzed` | number | Tổng số báo cáo đã phân tích |
| `queryAnalysis` | object | Thông tin phân tích query |
| `queryAnalysis.intent` | string | Ý định phát hiện được |
| `queryAnalysis.confidence` | number | Độ tin cậy (0-1) |
| `usage` | object | Thông tin token sử dụng |
| `usage.prompt_tokens` | number | Số token trong prompt |
| `usage.completion_tokens` | number | Số token trong response |
| `usage.total_tokens` | number | Tổng số token |

#### Ví dụ Request/Response

**cURL:**
```bash
curl -X POST http://localhost:5999/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Phân tích cổ phiếu VIC"
  }'
```

**JavaScript (Fetch):**
```javascript
const analyzeStock = async (ticker) => {
  const response = await fetch('http://localhost:5999/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Phân tích cổ phiếu ${ticker}`,
      model: 'gpt-5-chat-latest'
    })
  });

  const data = await response.json();
  
  if (data.success && data.type === 'stock_analysis') {
    console.log(`Ticker: ${data.ticker}`);
    console.log(`Analysis: ${data.message}`);
    console.log(`Reports analyzed: ${data.totalReportsAnalyzed}`);
    data.reports.forEach((report, idx) => {
      console.log(`\nReport ${idx + 1}:`);
      console.log(`  Title: ${report.title}`);
      console.log(`  Source: ${report.source}`);
      console.log(`  Recommendation: ${report.recommend}`);
      console.log(`  Target Price: ${report.targetPrice}`);
    });
  }
  
  return data;
};

// Sử dụng
analyzeStock('VIC');
```

**Python (requests):**
```python
import requests
import json

def analyze_stock(ticker):
    url = "http://localhost:5999/api/chat"
    payload = {
        "message": f"Phân tích cổ phiếu {ticker}",
        "model": "gpt-5-chat-latest"
    }
    
    response = requests.post(url, json=payload)
    data = response.json()
    
    if data.get('success') and data.get('type') == 'stock_analysis':
        print(f"Ticker: {data['ticker']}")
        print(f"Analysis: {data['message']}")
        print(f"Reports analyzed: {data['totalReportsAnalyzed']}")
        
        for idx, report in enumerate(data['reports'], 1):
            print(f"\nReport {idx}:")
            print(f"  Title: {report['title']}")
            print(f"  Source: {report['source']}")
            print(f"  Recommendation: {report['recommend']}")
            print(f"  Target Price: {report['targetPrice']}")
    
    return data

# Sử dụng
analyze_stock('VIC')
```

---

### 2.2. General Chat Response

Khi câu hỏi không liên quan đến phân tích cổ phiếu cụ thể.

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "success": true,
  "type": "general_chat",
  "message": "Thị trường chứng khoán Việt Nam hiện đang có xu hướng tích cực...",
  "queryAnalysis": {
    "intent": "general_chat",
    "confidence": 0.85
  },
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 85,
    "total_tokens": 205
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Trạng thái xử lý request |
| `type` | string | Loại response: `"general_chat"` |
| `message` | string | Câu trả lời từ AI |
| `queryAnalysis` | object | Thông tin phân tích query |
| `queryAnalysis.intent` | string | Ý định: `"general_chat"` |
| `queryAnalysis.confidence` | number | Độ tin cậy (0-1) |
| `usage` | object | Thông tin token sử dụng |

#### Ví dụ Request/Response

**cURL:**
```bash
curl -X POST http://localhost:5999/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Thị trường chứng khoán Việt Nam hiện tại như thế nào?"
  }'
```

**JavaScript:**
```javascript
const chat = async (message) => {
  const response = await fetch('http://localhost:5999/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message })
  });

  const data = await response.json();
  console.log(data.message);
  return data;
};

// Sử dụng
chat('Các yếu tố ảnh hưởng đến giá cổ phiếu là gì?');
```

---

## Error Responses

### 400 Bad Request

Thiếu parameters bắt buộc.

**Response:**
```json
{
  "error": "Message is required"
}
```

**Ví dụ:**
```bash
# Request không có message
curl -X POST http://localhost:5999/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 500 Internal Server Error

Lỗi xử lý từ server.

**Response:**
```json
{
  "error": "Failed to process smart chat request",
  "details": "OpenAI API error: Rate limit exceeded"
}
```

**Nguyên nhân có thể:**
- OpenAI API key không hợp lệ
- Rate limit exceeded
- Lỗi kết nối đến Simplize API
- Lỗi parse PDF
- Timeout

---

## Query Analysis

API sử dụng AI để phân tích ý định của câu hỏi trước khi xử lý.

### Supported Intents

| Intent | Description | Ví dụ |
|--------|-------------|-------|
| `stock_analysis` | Yêu cầu phân tích cổ phiếu | "Phân tích VIC", "VCB thế nào?" |
| `general_chat` | Chat thông thường | "Thị trường hôm nay ra sao?" |

### Ticker Detection

API tự động phát hiện mã cổ phiếu từ câu hỏi:

**Các format được hỗ trợ:**
- Chỉ mã: `"VIC"`, `"VCB"`, `"HPG"`
- Có tiền tố: `"cổ phiếu VIC"`, `"mã VCB"`
- Trong câu: `"Phân tích VIC cho tôi"`, `"VCB có tốt không?"`

**Confidence Threshold:**
- `>= 0.5`: Xử lý như phân tích cổ phiếu
- `< 0.5`: Xử lý như chat thông thường

---

## Rate Limiting

Hiện tại API **không có** rate limiting. Khuyến nghị implement rate limiting khi deploy production.

**Recommended limits:**
- 100 requests/minute per IP
- 1000 requests/hour per IP

---

## Best Practices

### 1. Error Handling

Luôn kiểm tra `success` field và xử lý errors:

```javascript
const response = await fetch('http://localhost:5999/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Phân tích VIC' })
});

const data = await response.json();

if (!response.ok) {
  console.error('API Error:', data.error);
  console.error('Details:', data.details);
  return;
}

if (data.success) {
  // Xử lý kết quả thành công
  if (data.type === 'stock_analysis') {
    // Xử lý phân tích cổ phiếu
  } else {
    // Xử lý chat thông thường
  }
}
```

### 2. Timeout Handling

Set timeout cho requests để tránh chờ quá lâu:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

try {
  const response = await fetch('http://localhost:5999/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Phân tích VIC' }),
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  
  const data = await response.json();
  // Xử lý data
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  } else {
    console.error('Request failed:', error);
  }
}
```

### 3. Model Selection

Chọn model phù hợp với nhu cầu:

```javascript
// Phân tích chi tiết, chất lượng cao
const response = await fetch('http://localhost:5999/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Phân tích VIC',
    model: 'gpt-5-chat-latest'  // Model mạnh nhất
  })
});
```

### 4. Retry Logic

Implement retry cho các lỗi tạm thời:

```javascript
async function chatWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:5999/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        return await response.json();
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Integration Examples

### React Integration

```jsx
import { useState } from 'react';

function StockAnalysis() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5999/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Nhập câu hỏi hoặc mã cổ phiếu"
      />
      <button onClick={analyze} disabled={loading}>
        {loading ? 'Đang phân tích...' : 'Phân tích'}
      </button>

      {error && <div className="error">{error}</div>}

      {result && result.type === 'stock_analysis' && (
        <div>
          <h2>Phân tích {result.ticker}</h2>
          <p>{result.message}</p>
          <h3>Báo cáo ({result.totalReportsAnalyzed})</h3>
          {result.reports.map((report, idx) => (
            <div key={idx}>
              <h4>{report.title}</h4>
              <p>Nguồn: {report.source}</p>
              <p>Khuyến nghị: {report.recommend}</p>
              <p>Giá mục tiêu: {report.targetPrice}</p>
            </div>
          ))}
        </div>
      )}

      {result && result.type === 'general_chat' && (
        <div>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
```

### Node.js Backend Integration

```javascript
const axios = require('axios');

class AriXClient {
  constructor(baseURL = 'http://localhost:5999') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async chat(message, model = 'gpt-5-chat-latest') {
    try {
      const response = await this.client.post('/api/chat', {
        message,
        model
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  }

  async analyzeStock(ticker) {
    return this.chat(`Phân tích cổ phiếu ${ticker}`);
  }

  async healthCheck() {
    const response = await this.client.get('/api');
    return response.data;
  }
}

// Sử dụng
const client = new AriXClient();

async function main() {
  // Health check
  const health = await client.healthCheck();
  console.log('Health:', health);

  // Phân tích cổ phiếu
  const analysis = await client.analyzeStock('VIC');
  console.log(analysis);

  // Chat thông thường
  const chat = await client.chat('Thị trường chứng khoán ra sao?');
  console.log(chat);
}

main();
```

---

## Webhooks & Callbacks

Hiện tại API **không hỗ trợ** webhooks. Tất cả requests đều đồng bộ (synchronous).

---

## Performance

### Response Time

| Endpoint | Average | Max |
|----------|---------|-----|
| `GET /api` | < 10ms | 50ms |
| `POST /api/chat` (general) | 2-5s | 10s |
| `POST /api/chat` (stock analysis) | 30-60s | 120s |

### Factors Affecting Performance

1. **Số lượng báo cáo**: Nhiều báo cáo = chậm hơn
2. **Kích thước PDF**: PDF lớn mất nhiều thời gian parse
3. **Model AI**: Model mạnh hơn = chậm hơn
4. **Network latency**: Tốc độ kết nối đến Simplize và OpenAI

---

## Security

### Current Implementation

- ❌ **No authentication**: API hiện không yêu cầu authentication
- ✅ **CORS enabled**: Cho phép mọi origin
- ❌ **No rate limiting**: Không giới hạn số requests
- ❌ **No input validation**: Chỉ validation cơ bản

### Recommendations for Production

1. **Add API Key Authentication**
   ```javascript
   headers: {
     'Content-Type': 'application/json',
     'X-API-Key': 'your-api-key'
   }
   ```

2. **Implement Rate Limiting**
   - Use `express-rate-limit` package
   - Limit requests per IP/API key

3. **Input Sanitization**
   - Validate và sanitize message input
   - Prevent injection attacks

4. **HTTPS Only**
   - Deploy với SSL/TLS certificate
   - Reject HTTP requests

5. **Request Size Limits**
   - Limit request body size
   - Prevent DoS attacks

---

## Changelog

### Version 1.0.0 (Current)

**Features:**
- ✅ Smart chat với auto stock detection
- ✅ Phân tích cổ phiếu từ báo cáo Simplize
- ✅ AI-powered query analysis
- ✅ Support GPT-5 models

**Endpoints:**
- `GET /api` - Health check
- `POST /api/chat` - Smart chat

---

## Support

Nếu có vấn đề hoặc câu hỏi, vui lòng:

1. Kiểm tra logs trong console
2. Verify API key trong `.env`
3. Check network connectivity
4. Review error messages

---

## FAQ

### Q: Làm sao để phân tích nhiều cổ phiếu cùng lúc?

**A:** Gửi nhiều requests riêng biệt cho từng mã cổ phiếu:

```javascript
const tickers = ['VIC', 'VCB', 'HPG'];
const results = await Promise.all(
  tickers.map(ticker => 
    fetch('http://localhost:5999/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Phân tích ${ticker}` })
    }).then(r => r.json())
  )
);
```

### Q: Tại sao request mất nhiều thời gian?

**A:** Phân tích cổ phiếu cần:
1. Tải danh sách báo cáo từ Simplize
2. Download và parse PDF (5 files)
3. Gửi đến AI để phân tích
4. Tổng hợp kết quả

Thời gian trung bình: 30-60 giây.

### Q: API có cache kết quả không?

**A:** Hiện tại **không có** caching. Mỗi request đều xử lý mới.

### Q: Làm sao để chỉ định số báo cáo phân tích?

**A:** Hiện tại cố định 5 báo cáo gần nhất (60 ngày). Có thể config trong `CONFIG.MAX_REPORTS_TO_ANALYZE`.

### Q: Model nào nên sử dụng?

**A:**
- `gpt-5-chat-latest`: Mặc định, tốt nhất cho phân tích chi tiết
- `gpt-5-mini-2025-08-07`: Chỉ dùng nội bộ cho query analysis

---

**Last Updated:** October 4, 2025

