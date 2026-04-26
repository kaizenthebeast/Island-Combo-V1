"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupFormInput } from "@/form-schema/signupSchema";
import Image from "next/image";

export function SignUpForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignupFormInput>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupFormInput> = async (data) => {
    setMessage("");
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Get anon user BEFORE signup
      const { data: { user: anonUser } } = await supabase.auth.getUser();
      const guestUserId = anonUser?.is_anonymous ? anonUser.id : null;

      // Store guest ID in cookie so we can merge AFTER email confirmation
      if (guestUserId) {
        document.cookie = `guest_user_id=${guestUserId}; path=/; max-age=600`;
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`,
        },
      });
      if (error) {
        throw new Error(error?.message || "Signup failed");
      }

      reset();
      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignUp = async () => {
    const supabase = createClient();

    try {
      const guestId = localStorage.getItem("guest_id");
      if (guestId) {
        document.cookie = `guest_id=${guestId}; path=/; max-age=600`;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error("Google OAuth error:", err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 flex flex-col justify-center">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>


          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Email */}
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="john@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="••••••••" {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Message */}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full bg-[#900036]" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-md text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          {/* Google Login */}
          <button
            type="button"
            onClick={googleSignUp}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition mb-4"
          >
            <Image
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              width={20}
              height={20}
            />

            <span className="font-medium text-gray-700">
              Continue with Google
            </span>
          </button>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/auth/login" className="underline underline-offset-4">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
