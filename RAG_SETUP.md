# RAG Setup - Báo cáo tài chính

Hướng dẫn cài đặt và sử dụng RAG (Retrieval Augmented Generation) để nạp dữ liệu báo cáo tài chính vào Arix Pro.

## 🎯 Tổng quan

RAG cho phép Arix Pro truy cập dữ liệu báo cáo tài chính (balance sheet, income statement, cash flow) từ Qdrant vector database. Dữ liệu này được sử dụng **CHỈ ĐỂ THAM KHẢO**, nguồn chính vẫn là các file PDF phân tích từ công ty chứng khoán.

## 📋 Yêu cầu

1. **Qdrant Vector Database**
   - Cài đặt Qdrant: https://qdrant.tech/documentation/quick-start/
   - Mặc định chạy tại: `localhost:6333`

2. **Environment Variables**
   
Thêm vào file `.env`:

```env
# RAG Settings
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=financial_vectors
```

## 🚀 Cài đặt Qdrant

### Cách 1: Docker (Khuyến nghị)

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Cách 2: Docker Compose

Tạo file `docker-compose.yml`:

```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
    volumes:
      - ./qdrant_storage:/qdrant/storage
```

Chạy:
```bash
docker-compose up -d
```

## 📥 Nạp dữ liệu tài chính

### Nạp 1 mã cổ phiếu:

```bash
npm run ingest VIC
```

### Nạp nhiều mã cổ phiếu:

```bash
npm run ingest VIC HPG FPT VCB
```

### Nạp thủ công với ts-node:

```bash
npx ts-node scripts/ingestFinancialData.ts VIC
```

## 📊 Dữ liệu được nạp

Script sẽ tự động lấy dữ liệu từ IQX API cho các section:

1. **CASH_FLOW** - Báo cáo lưu chuyển tiền tệ
2. **INCOME_STATEMENT** - Báo cáo kết quả kinh doanh
3. **BALANCE_SHEET** - Bảng cân đối kế toán
4. **statistics-financial** - Các chỉ số tài chính

Dữ liệu bao gồm:
- Các chỉ số tài chính quan trọng: ROE, ROA, EPS, P/E, P/B, etc.
- Doanh thu, lợi nhuận, tổng tài sản, vốn chủ sở hữu
- Dữ liệu theo quý và theo năm (3 năm gần nhất)

## 🔍 Cách hoạt động

1. **Khi user hỏi về cổ phiếu:**
   - Arix Pro sẽ tự động query dữ liệu tài chính từ Qdrant
   - Dữ liệu tài chính được thêm vào context với nhãn `[CHỈ THAM KHẢO]`

2. **Ưu tiên nguồn dữ liệu:**
   - 🎯 **NGUỒN CHÍNH**: Phân tích từ PDF (công ty chứng khoán)
   - 📑 **THAM KHẢO**: Báo cáo tài chính (từ RAG)

3. **Chiến lược retrieval:**
   - Nếu hỏi về "mới nhất" → Lấy dữ liệu gần đây nhất
   - Nếu hỏi về "năm" → Ưu tiên dữ liệu Q5 (annual)
   - Nếu hỏi về "quý" → Ưu tiên dữ liệu Q1-Q4 (quarterly)
   - Semantic search cho các câu hỏi phức tạp

## 📝 Ví dụ

### Nạp dữ liệu cho VIC:

```bash
npm run ingest VIC
```

Output:
```
============================================================
🚀 FINANCIAL DATA INGESTION SCRIPT
============================================================

📋 Danh sách mã cổ phiếu: VIC
🔧 Qdrant: localhost:6333
📦 Collection: financial_vectors

============================================================
[1/1] Processing VIC
============================================================

📈 Đang lấy dữ liệu cho mã VIC...
🔹 Fetching https://proxy.iqx.vn/proxy/trading/api/iq-insight-service/v1/company/VIC/financial-statement?section=CASH_FLOW
🔹 Fetching https://proxy.iqx.vn/proxy/trading/api/iq-insight-service/v1/company/VIC/financial-statement?section=INCOME_STATEMENT
...
🚀 Bắt đầu xử lý 45 điểm dữ liệu...
📊 Đã xử lý 10/45 điểm dữ liệu...
📊 Đã xử lý 20/45 điểm dữ liệu...
...
✅ Đã nạp 45 đoạn dữ liệu cho VIC.

============================================================
✅ HOÀN TẤT TẤT CẢ!
============================================================
```

## 🔧 Troubleshooting

### Qdrant không kết nối được

```bash
# Kiểm tra Qdrant đang chạy
curl http://localhost:6333/collections

# Restart Qdrant
docker restart <container_id>
```

### Lỗi embedding

Kiểm tra `OPENAI_API_KEY` trong file `.env`:
```env
OPENAI_API_KEY=your_key_here
```

### Xóa và tạo lại collection

```bash
curl -X DELETE http://localhost:6333/collections/financial_vectors
```

Sau đó nạp lại dữ liệu:
```bash
npm run ingest VIC
```

## 📈 Monitoring

### Kiểm tra collection:

```bash
curl http://localhost:6333/collections/financial_vectors
```

### Đếm số điểm dữ liệu:

```bash
curl http://localhost:6333/collections/financial_vectors/points/scroll -H "Content-Type: application/json" -d '{"limit": 1}'
```

## 🎓 Best Practices

1. **Nạp dữ liệu định kỳ**: Cập nhật dữ liệu mỗi quý khi có báo cáo tài chính mới
2. **Nạp nhiều mã**: Một lần nạp nhiều mã để tối ưu performance
3. **Backup**: Backup thư mục `qdrant_storage` định kỳ
4. **Monitor**: Theo dõi Qdrant dashboard tại `http://localhost:6333/dashboard`

## 📚 Tài liệu tham khảo

- Qdrant Documentation: https://qdrant.tech/documentation/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- IQX API: https://proxy.iqx.vn/

## ⚠️ Lưu ý quan trọng

1. **Năm hiện tại**: Luôn cập nhật `CURRENT_YEAR` và `CURRENT_QUARTER` trong `src/config/constants.ts`
2. **Ưu tiên PDF**: Dữ liệu tài chính chỉ để tham khảo, phân tích chính từ PDF
3. **Cost**: Mỗi điểm dữ liệu cần 1 lần gọi embedding API → Chi phí tăng theo số lượng mã

