"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { TwoFactorVerification } from "./two-factor-verification";
import {
  signInSchema,
  signUpSchema,
  SignInFormData,
  SignUpFormData,
} from "@/lib/validations";

interface AuthFormProps {
  mode?: "signin" | "signup";
  onSuccess?: () => void;
  redirectTo?: string;
}

export function AuthForm({
  mode = "signin",
  onSuccess,
  redirectTo,
}: AuthFormProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(mode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { signIn, signUp } = useAuth();

  const isSignUp = authMode === "signup";

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const currentForm = isSignUp ? signUpForm : signInForm;

  const onSubmit = async (data: SignInFormData | SignUpFormData) => {
    setIsLoading(true);

    try {
      console.log("Form submit started", { isSignUp, redirectTo });
      let result;

      if (isSignUp) {
        const signUpData = data as SignUpFormData;
        result = await signUp(
          signUpData.email,
          signUpData.password,
          signUpData.first_name,
          signUpData.last_name,
          signUpData.phone
        );
      } else {
        const signInData = data as SignInFormData;
        console.log("Calling signIn...");
        result = await signIn(signInData.email, signInData.password);
        console.log("SignIn result:", result);

        // TODO: Check if user has 2FA enabled and show 2FA verification
        // For now, we'll simulate this check
        if (!result.error) {
          setUserEmail(signInData.email);
          // Simulate checking if user has 2FA enabled
          const has2FA = false; // This would come from the auth result

          if (has2FA) {
            setShow2FA(true);
            return;
          }
        }
      }

      console.log("Auth result:", result);

      if (!result.error) {
        currentForm.reset();
        onSuccess?.();

        if (redirectTo) {
          console.log("Redirecting to:", redirectTo);
          window.location.href = redirectTo;
        }
      }
    } catch (error) {
      console.error("Form submit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setAuthMode((prev) => (prev === "signin" ? "signup" : "signin"));
    signInForm.reset();
    signUpForm.reset();
    setShow2FA(false);
  };

  const handle2FASuccess = () => {
    currentForm.reset();
    onSuccess?.();

    if (redirectTo) {
      window.location.href = redirectTo;
    }
  };

  const handle2FABack = () => {
    setShow2FA(false);
    setIsLoading(false);
  };

  // Show 2FA verification if needed
  if (show2FA) {
    return (
      <TwoFactorVerification
        email={userEmail}
        onSuccess={handle2FASuccess}
        onBack={handle2FABack}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </CardTitle>
        <CardDescription className="text-center">
          {isSignUp
            ? "Sign up to create and manage contact groups"
            : "Sign in to your account to continue"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={currentForm.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  {...signUpForm.register("first_name")}
                  className={
                    signUpForm.formState.errors.first_name
                      ? "border-red-500"
                      : ""
                  }
                />
                {signUpForm.formState.errors.first_name && (
                  <p className="text-sm text-red-500">
                    {signUpForm.formState.errors.first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  {...signUpForm.register("last_name")}
                  className={
                    signUpForm.formState.errors.last_name
                      ? "border-red-500"
                      : ""
                  }
                />
                {signUpForm.formState.errors.last_name && (
                  <p className="text-sm text-red-500">
                    {signUpForm.formState.errors.last_name.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...(isSignUp
                ? signUpForm.register("email")
                : signInForm.register("email"))}
              className={
                currentForm.formState.errors.email ? "border-red-500" : ""
              }
            />
            {currentForm.formState.errors.email && (
              <p className="text-sm text-red-500">
                {currentForm.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={
                  isSignUp
                    ? "Create a password (min 8 characters)"
                    : "Enter your password"
                }
                {...(isSignUp
                  ? signUpForm.register("password")
                  : signInForm.register("password"))}
                className={
                  currentForm.formState.errors.password
                    ? "border-red-500 pr-10"
                    : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {currentForm.formState.errors.password && (
              <p className="text-sm text-red-500">
                {currentForm.formState.errors.password.message}
              </p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number <span className="text-gray-500">(optional)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                {...signUpForm.register("phone")}
                className={
                  signUpForm.formState.errors.phone ? "border-red-500" : ""
                }
              />
              {signUpForm.formState.errors.phone && (
                <p className="text-sm text-red-500">
                  {signUpForm.formState.errors.phone.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Phone number is required for SMS notifications and 2FA
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                data-testid="loading-spinner"
              />
            )}
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-blue-600 hover:text-blue-500 underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        {isSignUp && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy
          </div>
        )}
      </CardContent>
    </Card>
  );
}
