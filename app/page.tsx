import { redirect } from "next/navigation";

// Root path: middleware will redirect to /login if unauthenticated.
// If authenticated, send to /dashboard.
export default function RootPage() {
  redirect("/dashboard");
}
