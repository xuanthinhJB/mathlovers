import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { IconLogo } from "@/components/icons";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <IconLogo size={26} />
          <span className="font-semibold tracking-tight">MathLovers</span>
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[var(--muted)]">{subtitle}</p>}
          <div className="card-raised mt-6 p-6">{children}</div>
          {footer && <div className="mt-5 text-center text-sm text-[var(--muted)]">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
