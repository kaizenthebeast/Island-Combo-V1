"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormInput } from "@/lib/validations/login";

import { createClient } from "@/lib/supabase/client";
import { signInWithGoogle } from "@/lib/auth/google-sign-in";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

const onSubmit: SubmitHandler<LoginFormInput> = async (data) => {
    setMessage('');
    setIsLoading(true);

    try {
        // Capture guest session on the client BEFORE calling the API
        const supabase = createClient();
        const { data: { session: anonSession } } = await supabase.auth.getSession();
        const guestUserId = anonSession?.user?.is_anonymous ? anonSession.user.id : null;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Pass guestUserId so the server can handle the cart merge
            body: JSON.stringify({ email: data.email, password: data.password, guestUserId }),
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || 'Login failed');
        }

        router.push(result.data.redirectTo);
    } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
        setIsLoading(false);
    }
};

  const googleLogin = async () => {
    setMessage("");
    const error = await signInWithGoogle();
    if (error) setMessage(error);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6 flex flex-col justify-center">
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
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
                        placeholder="Email or username"
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
                          autoComplete="current-password"
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

              {message && <p className="text-sm text-danger">{message}</p>}

              <Link
                href="/auth/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline text-right w-full flex justify-end"
              >
                Forgot your password?
              </Link>

              <Button type="submit" className="w-full bg-brand rounded-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
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
            onClick={googleLogin}
            className="w-full flex items-center justify-center gap-3 border border-border py-2 rounded-lg hover:bg-muted transition mb-4"
          >
            <Image
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google logo"
              width={20}
              height={20}
            />

            <span className="font-medium text-foreground">
              Login with Google
            </span>
          </button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
