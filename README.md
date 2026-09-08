# MathLovers

Trang web hỗ trợ học sinh học Toán bằng **gợi ý tư duy** — trợ giảng AI dẫn dắt từng bậc và
đặt câu hỏi, **không bao giờ đưa lời giải hay đáp số**.

## Tính năng

**Học sinh** (`/hoc`) — không cần đăng nhập
- Chọn bài thầy cô đã soạn, hoặc tự gõ đề
- Chụp ảnh đề bằng camera (hoặc tải ảnh lên) → AI đọc đề thành văn bản
- Nhận gợi ý theo 4 bậc, trả lời câu hỏi dẫn dắt, xin "gợi ý sâu hơn" khi bí
- Công thức toán hiển thị bằng KaTeX

**Giáo viên** (`/admin`) — đăng nhập Supabase Auth
- Soạn bài toán: đề, chủ đề, độ khó, **system prompt gợi ý riêng từng bài**, hướng tiếp cận,
  lỗi thường gặp, đáp án (chỉ AI thấy để đối chiếu)
- Cấu hình AI provider: nhà cung cấp, base URL, model, API key, temperature, max tokens
  - Vai trò **text** — sinh gợi ý (mặc định DeepSeek)
  - Vai trò **vision** — đọc ảnh đề bài
  - Nút "Kiểm tra" gọi thử model để xác minh key
- Sửa prompt chung toàn hệ thống và prompt OCR

## Kiến trúc

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase Postgres — RLS bật ở mọi bảng, mặc định chặn; truy cập dữ liệu đi qua API route
  phía server dùng `service_role`
- Lớp AI trừu tượng `src/lib/ai.ts`: hỗ trợ mọi endpoint OpenAI-compatible
  (DeepSeek, OpenAI, Gemini, OpenRouter, custom) và Anthropic Messages API
- Rào chắn prompt (`src/lib/prompt.ts`) luôn được nối vào cuối mọi system prompt, không thể
  tắt từ giao diện — kể cả khi học sinh cố dụ AI đưa đáp án

## Biến môi trường

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SETUP_CODE=
```

## Chạy local

```bash
npm install
cp .env.example .env.local   # điền giá trị thật
npm run dev
```

## Thiết lập lần đầu

1. Mở `/thiet-lap`, nhập email + mật khẩu + `ADMIN_SETUP_CODE` → tạo tài khoản quản trị
   (chỉ chạy được khi chưa có admin nào)
2. Đăng nhập tại `/dang-nhap`
3. Vào `/admin/providers` dán API key DeepSeek cho provider mặc định
4. Muốn dùng camera: thêm một provider vai trò **Đọc ảnh** (Gemini hoặc OpenAI)
5. Soạn bài tại `/admin/problems`
