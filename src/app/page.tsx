import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">MATHLOVERS</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
        Không cho lời giải.
        <br />
        Chỉ dẫn em tự tìm ra nó.
      </h1>
      <p className="mt-4 max-w-xl text-[var(--muted)]">
        Học sinh nhập đề bằng chữ hoặc chụp ảnh đề. Trợ giảng AI sẽ đưa gợi ý theo từng bậc
        và đặt câu hỏi dẫn dắt — không bao giờ đưa đáp số.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/hoc" className="card block p-6 transition hover:border-[var(--accent)]">
          <div className="text-lg font-bold">Tôi là học sinh</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Nhập đề bài hoặc chụp ảnh, nhận gợi ý từng bước.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
            Bắt đầu học →
          </span>
        </Link>

        <Link href="/admin" className="card block p-6 transition hover:border-[var(--accent)]">
          <div className="text-lg font-bold">Tôi là giáo viên</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Soạn bài toán, cấu hình prompt gợi ý và AI provider.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]">
            Vào trang quản trị →
          </span>
        </Link>
      </div>

      <div className="card mt-10 bg-[var(--accent-soft)] p-5 text-sm">
        <div className="font-semibold">Bốn bậc gợi ý</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--muted)]">
          <li>Đọc hiểu đề — dữ kiện gì đã cho, cần tìm gì?</li>
          <li>Gợi nhớ kiến thức, định lý, công thức liên quan.</li>
          <li>Gợi ý chiến lược tiếp cận.</li>
          <li>Gợi ý bước biến đổi đầu tiên — phần tính toán vẫn là của em.</li>
        </ol>
      </div>
    </main>
  );
}
