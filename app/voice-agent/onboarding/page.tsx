import OnboardingWizard from "@/components/voice-agent/OnboardingWizard";
import { Mic2 } from "lucide-react";

export const metadata = { title: "New Business — Voice Agent" };

export default function OnboardingPage() {
  return (
    <div className="animate-fade-up">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-100 border border-violet-200 mb-4">
          <Mic2 className="w-6 h-6 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set Up Your AI Voice Agent</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Tell us about your business and we'll configure a bilingual AI agent that handles calls, bookings, and orders for you.
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
