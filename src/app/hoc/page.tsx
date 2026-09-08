import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import StudentApp from "./StudentApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Học cùng MathLovers" };

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap");

  return (
    <StudentApp
      displayName={user.full_name ?? user.email}
      isAdmin={user.role === "admin"}
    />
  );
}
