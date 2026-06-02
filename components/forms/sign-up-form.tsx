"use client";

import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/helper/googleSignIn";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupFormInput } from "@/form-schema/signupSchema";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<SignupFormInput> = async (data) => {
    setMessage("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { session: anonSession } } = await supabase.auth.getSession();
      const guestUserId = anonSession?.user.id;

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          guestUserId
        })
      })

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Signup failed");
      }

      form.reset();
      router.push(result.data.redirectTo);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignUp = async () => {
    setMessage("");
    const error = await signInWithGoogle();
    if (error) setMessage(error);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 flex flex-col justify-center">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        autoComplete="email"
                        aria-label="Email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          autoComplete="new-password"
                          aria-label="Password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Confirm password"
                          autoComplete="new-password"
                          aria-label="Confirm password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && <p className="text-sm text-danger">{message}</p>}

              <Button type="submit" className="w-full bg-brand rounded-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-muted" />
            <span className="text-md text-muted-foreground">Or</span>
            <div className="flex-1 h-px bg-muted" />
          </div>
          {/* Google Login */}
          <button
            type="button"
            onClick={googleSignUp}
            className="w-full flex items-center justify-center gap-3 border border-border py-2 rounded-lg hover:bg-muted transition mb-4"
          >
            <Image
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              width={20}
              height={20}
            />

            <span className="font-medium text-foreground">
              Sign up with Google
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
