import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap");
  if (user.role !== "admin") redirect("/hoc");

  return (
    <AdminShell email={user.email} name={user.full_name ?? user.email}>
      {children}
    </AdminShell>
  );
}
