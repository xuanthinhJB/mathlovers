import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">MATHLOVERS</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
        Không cho lời giải.
        <br />
        Chỉ dẫn em tự tìm ra nó.
      </h1>
      <p className="mt-4 max-w-xl text-[var(--muted)]">
        Học sinh nhập đề bằng chữ hoặc chụp ảnh đề. Trợ giảng AI đưa gợi ý theo từng bậc và đặt
        câu hỏi dẫn dắt — không bao giờ đưa đáp số.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/dang-nhap" className="btn btn-primary">
          Đăng nhập
        </Link>
        <Link href="/dang-ky" className="btn btn-ghost">
          Đăng ký cho học sinh
        </Link>
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Đăng nhập xong hệ thống tự đưa bạn tới đúng giao diện: học sinh vào trang học, giáo viên
        vào trang quản trị.
      </p>

      <div className="card mt-12 bg-[var(--accent-soft)] p-5 text-sm">
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
