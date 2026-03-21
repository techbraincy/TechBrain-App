import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // If already logged in, redirect away
  const session = await getCurrentSession();
  if (session) {
    redirect(next ?? "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Sheets Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
