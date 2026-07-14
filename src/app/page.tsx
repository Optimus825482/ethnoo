import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3016";
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: `session_token=${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const role = json.data?.user?.role;
        if (role === "ADMIN") return redirect("/admin/dashboard");
        if (role === "DRIVER") return redirect("/driver/dashboard");
      }
    } catch {
      // fall through
    }
  }
  return redirect("/login");
}
