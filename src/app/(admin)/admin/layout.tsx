import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin-nav";
import { Loading } from "@/components/ui/loading";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) redirect("/login");

  const res = await fetch(`${process.env.NEXTAUTH_URL!}/api/auth/me`, {
    headers: { Cookie: `session_token=${sessionToken}` },
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");
  const json = await res.json();
  if (json.data?.user?.role !== "ADMIN") redirect("/driver/dashboard");

  return (
    <div className="flex min-h-[100dvh]">
      <AdminNav user={{ fullName: json.data.user.fullName }} />
      <main className="flex-1 overflow-auto p-4 md:p-8 pt-14 md:pt-8 pb-20 md:pb-8 w-full max-w-[1600px] mx-auto">
        <Suspense fallback={<Loading fullPage />}>{children}</Suspense>
      </main>
    </div>
  );
}
