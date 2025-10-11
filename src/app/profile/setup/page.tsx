"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { useAuth } from "@/hooks/use-auth";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // If user already has a complete profile, redirect to dashboard
    if (!loading && profile?.first_name && profile?.last_name) {
      router.push("/dashboard");
    }

    // If no user, redirect to auth
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || (profile?.first_name && profile?.last_name)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please provide your information to get started with Shared Contact
            Groups
          </p>
        </div>

        <ProfileForm onSuccess={() => router.push("/dashboard")} />
      </div>
    </div>
  );
}
