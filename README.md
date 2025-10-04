# AriX Stock Analysis API

API phân tích cổ phiếu thông minh sử dụng AI để tự động phân tích báo cáo tài chính từ Simplize.

## 🚀 Tính năng

- **Smart Chat**: Trò chuyện thông minh với khả năng tự động phát hiện yêu cầu phân tích cổ phiếu
- **Tự động phân tích cổ phiếu**: Tự động tải và phân tích báo cáo PDF từ Simplize
- **AI-Powered**: Sử dụng GPT-5 để phân tích và tổng hợp thông tin
- **Lọc báo cáo thông minh**: Chỉ phân tích báo cáo mới nhất (trong vòng 60 ngày)

## 📋 Yêu cầu

- Node.js >= 18
- pnpm (hoặc npm/yarn)
- OpenAI API key (hoặc API tương thích)

## 🔧 Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd AriX
```

2. Cài đặt dependencies:
```bash
pnpm install
```

3. Tạo file `.env`:
```bash
cp .env.example .env
```

4. Cấu hình biến môi trường trong file `.env`:
```env
PORT=3000
OPENAI_API_KEY=your_api_key_here
```

## 🏃 Chạy ứng dụng

### Development mode
```bash
pnpm dev
```

### Production mode
```bash
pnpm build
pnpm start
```

Server sẽ chạy tại: `http://localhost:3000`

## 📡 API Endpoints

### 1. Health Check
Kiểm tra trạng thái server.

**Endpoint:** `GET /api`

**Response:**
```
hello
```

---

### 2. Smart Chat
Trò chuyện thông minh với khả năng tự động phát hiện và phân tích cổ phiếu.

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "message": "Phân tích cổ phiếu VIC cho tôi",
  "model": "gpt-5-chat-latest"
}
```

**Parameters:**
- `message` (string, required): Câu hỏi/yêu cầu của người dùng
- `model` (string, optional): Model AI sử dụng. Default: `gpt-5-chat-latest`

**Response - Phân tích cổ phiếu:**
```json
{
  "success": true,
  "type": "stock_analysis",
  "ticker": "VIC",
  "message": "Phân tích chi tiết về cổ phiếu VIC...",
  "reports": [
    {
      "title": "Báo cáo phân tích VIC",
      "source": "VCBS",
      "issueDate": "2025-01-15",
      "recommend": "MUA",
      "targetPrice": "45000"
    }
  ],
  "totalReportsAnalyzed": 5,
  "queryAnalysis": {
    "intent": "stock_analysis",
    "confidence": 0.95
  },
  "usage": {
    "prompt_tokens": 15000,
    "completion_tokens": 1000,
    "total_tokens": 16000
  }
}
```

**Response - Chat thông thường:**
```json
{
  "success": true,
  "type": "general_chat",
  "message": "Câu trả lời từ AI...",
  "queryAnalysis": {
    "intent": "general_chat",
    "confidence": 0.85
  },
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  }
}
```

**Error Response:**
```json
{
  "error": "Failed to process smart chat request",
  "details": "Error message"
}
```

## 💡 Ví dụ sử dụng

### Sử dụng cURL

**Phân tích cổ phiếu:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Phân tích cổ phiếu VIC"
  }'
```

**Chat thông thường:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Thị trường chứng khoán Việt Nam hiện tại như thế nào?"
  }'
```

### Sử dụng JavaScript/Fetch

```javascript
// Phân tích cổ phiếu
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Phân tích cổ phiếu HPG cho tôi',
    model: 'gpt-5-chat-latest'
  })
});

const data = await response.json();
console.log(data);
```

### Sử dụng Python

```python
import requests

url = "http://localhost:3000/api/chat"
payload = {
    "message": "Phân tích cổ phiếu VCB",
    "model": "gpt-5-chat-latest"
}

response = requests.post(url, json=payload)
print(response.json())
```

## 🏗️ Cấu trúc dự án

```
AriX/
├── src/
│   ├── app.ts                      # Express app configuration
│   ├── index.ts                    # Entry point
│   ├── config/
│   │   └── constants.ts            # Configuration constants
│   ├── controllers/
│   │   ├── chatController.ts       # Chat & Smart Chat handlers
│   │   └── stockController.ts      # Stock analysis handlers
│   ├── services/
│   │   ├── openaiService.ts        # OpenAI API integration
│   │   ├── pdfService.ts           # PDF parsing service
│   │   ├── queryAnalysisService.ts # Query intent analysis
│   │   ├── simplizeService.ts      # Simplize API integration
│   │   └── stockAnalysisService.ts # Stock analysis logic
│   ├── prompts/
│   │   └── stockAnalysisPrompt.ts  # AI prompts
│   └── routes/
│       └── index.ts                # API routes
├── .env                            # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Cấu hình

Các thông số có thể cấu hình trong `src/config/constants.ts`:

```typescript
export const CONFIG = {
  PORT: 3000,                        // Cổng server
  OPENAI_API_KEY: '',                // OpenAI API key
  OPENAI_API_URL: '',                // OpenAI API URL
  DEFAULT_MODEL: 'gpt-5-chat-latest', // Model mặc định
  MINI_MODEL: 'gpt-5-mini-2025-08-07', // Model cho phân tích query
  MAX_REPORTS_TO_ANALYZE: 5,         // Số báo cáo tối đa phân tích
  MAX_REPORT_AGE_DAYS: 60,           // Tuổi báo cáo tối đa (ngày)
  PDF_TIMEOUT: 30000,                // Timeout tải PDF (ms)
  MAX_PDF_TEXT_LENGTH: 50000,        // Độ dài text PDF tối đa
  MAX_TOKENS: 2500,                  // Token tối đa cho response
  TEMPERATURE: 0.7,                  // Temperature cho AI
};
```

## 🔍 Cách hoạt động

1. **Query Analysis**: 
   - API sử dụng GPT-5 Mini để phân tích ý định của câu hỏi
   - Tự động phát hiện mã cổ phiếu (ticker) và loại yêu cầu

2. **Stock Analysis**:
   - Lấy danh sách báo cáo từ Simplize API
   - Lọc báo cáo mới nhất (60 ngày gần đây)
   - Tải và parse PDF báo cáo
   - Sử dụng GPT-5 để phân tích và tổng hợp

3. **Fallback**:
   - Nếu không phải phân tích cổ phiếu, xử lý như chat thông thường

## 🛡️ Error Handling

API trả về HTTP status codes chuẩn:

- `200`: Success
- `400`: Bad Request (thiếu parameters)
- `500`: Internal Server Error

Tất cả error responses đều có format:
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## 📝 Lưu ý

- API key OpenAI phải được cấu hình đúng trong file `.env`
- Simplize API có thể có rate limiting
- PDF parsing có thể mất thời gian với báo cáo lớn
- Recommended: sử dụng reverse proxy (nginx) cho production

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 👨‍💻 Author

Your Name

---

**Built with ❤️ using Node.js, TypeScript, and OpenAI**

