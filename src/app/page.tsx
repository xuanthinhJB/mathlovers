import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, homeFor } from "@/lib/supabase/server";
import ThemeToggle from "@/components/ThemeToggle";
import { IconCamera, IconLightbulb, IconLogo, IconSparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: 1, title: "Hiểu đề", body: "Dữ kiện gì đã cho, cần tìm gì?" },
  { n: 2, title: "Nhớ kiến thức", body: "Định lý, công thức nào liên quan?" },
  { n: 3, title: "Chiến lược", body: "Vẽ hình, đặt ẩn, hay xét trường hợp?" },
  { n: 4, title: "Bước đầu tiên", body: "Gợi ý phép biến đổi mở đầu." },
];

const FEATURES = [
  {
    icon: <IconLightbulb size={19} />,
    title: "Gợi ý theo bậc",
    body: "Mỗi lượt một gợi ý nhỏ kèm một câu hỏi dẫn dắt. Em bí thì xin gợi ý sâu hơn.",
  },
  {
    icon: <IconCamera size={19} />,
    title: "Chụp đề là xong",
    body: "Đưa camera vào đề bài, AI đọc thành văn bản, em không phải gõ lại công thức.",
  },
  {
    icon: <IconSparkle size={19} />,
    title: "Giáo viên cầm lái",
    body: "Mỗi bài có prompt gợi ý riêng do thầy cô soạn: hướng tiếp cận, lỗi thường gặp.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user.role));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        <IconLogo size={28} />
        <span className="font-semibold tracking-tight">MathLovers</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dang-nhap" className="btn btn-ghost btn-sm">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="py-14 sm:py-20">
          <span className="badge badge-accent">Trợ giảng Toán</span>
          <h1 className="mt-4 max-w-2xl text-[34px] font-semibold leading-[1.15] tracking-tight sm:text-[46px]">
            Không cho lời giải.
            <br />
            Chỉ dẫn em tự tìm ra nó.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] text-[var(--muted)]">
            Học sinh nhập đề bằng chữ hoặc chụp ảnh. Trợ giảng đưa gợi ý theo từng bậc và đặt câu
            hỏi dẫn dắt — không bao giờ đưa đáp số.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dang-ky" className="btn btn-primary">
              Bắt đầu học miễn phí
            </Link>
            <Link href="/dang-nhap" className="btn btn-ghost">
              Tôi đã có tài khoản
            </Link>
          </div>
          <p className="mt-3 text-[13px] text-[var(--faint)]">
            Đăng nhập xong hệ thống tự đưa bạn tới đúng giao diện — học sinh vào trang học, giáo
            viên vào trang quản trị.
          </p>
        </section>

        <section className="grid gap-4 pb-14 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                {f.icon}
              </div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="card-raised mb-16 p-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Bốn bậc gợi ý</h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Trợ giảng chỉ đi một bậc mỗi lượt. Học sinh phải tự nghĩ giữa các bậc.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-[var(--on-accent)]">
                  {s.n}
                </div>
                <div className="mt-3 text-[15px] font-semibold">{s.title}</div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--muted)]">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-6">
        <p className="mx-auto max-w-5xl px-5 text-[13px] text-[var(--faint)]">
          MathLovers — trợ giảng Toán gợi mở tư duy.
        </p>
      </footer>
    </div>
  );
}
