import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getCurrentSession();
  if (session) redirect(next ?? "/dashboard");

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e3a5f 65%, #0f172a 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6, transparent 70%)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1, transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5 blur-[160px] pointer-events-none"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="w-full max-w-[420px] relative animate-fade-up z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">TechBrain</h1>
              <p className="text-sm text-white/50 mt-0.5">Operations Platform</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>
          <div className="mb-7">
            <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your workspace to continue</p>
          </div>
          <LoginForm next={next} />
          <p className="text-center text-sm text-gray-500 mt-5">
            Not registered yet?{" "}
            <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-700 transition-colors">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
