"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
      //Get the anonymous user
      const { data: sessionData } = await supabase.auth.getSession();
      const guestId = sessionData?.session?.user?.id ?? null;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up-success`,
          data: {
            firstName: data.firstName,
            lastName: data.lastName
          },
        },
      });
      if (error) throw error;
      const newUserId = signUpData.user?.id

      //Merge cart if there was an anonymous session
      if (guestId && signUpData && guestId !== newUserId) {
        try {
          await supabase.rpc("merge_cart", {
            p_old_user_id: guestId,
            p_new_user_id: newUserId,
          });
        } catch (mergeError) {
          console.error("Cart merge error:", mergeError)
        }
      }

      reset();
      setMessage("User signed up successfully");
      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignUp = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) console.error("Google OAuth error:", error.message);
  };

  return (
    <div className="w-full max-w-md mx-auto shadow-lg rounded-xl space-y-6 flex flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Sign up with email or Google
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Signup */}
          <button
            type="button"
            onClick={googleSignUp}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition mb-4"
          >
            Sign up with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* First Name */}
            <div>
              <Label>First Name</Label>
              <Input placeholder="John" {...register("firstName")} />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
            </div>

            {/* Last Name */}
            <div>
              <Label>Last Name</Label>
              <Input placeholder="Doe" {...register("lastName")} />
              {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
            </div>

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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

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
