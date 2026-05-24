"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormInput } from "@/form-schema/loginSchema";

import { createClient } from "@/lib/supabase/client";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormInput> = async (data) => {
    setMessage("");
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data: { session: anonSession } } = await supabase.auth.getSession();
      const guestUserId = anonSession?.user?.is_anonymous ? anonSession.user.id : null;

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error || !signInData.session) {
        throw new Error(error?.message || "Login failed");
      }

      const authUserId = signInData.session.user.id;

      if (guestUserId && guestUserId !== authUserId) {
        const { error: mergeError } = await supabase.rpc("merge_cart", {
          p_guest_user_id: guestUserId,
          p_auth_user_id: authUserId,
        });
        if (mergeError) {
          throw new Error(`Failed to merge cart: ${mergeError.message}`);
        }
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("role")
        .eq("user_id", authUserId)
        .single();

      router.push(profile?.role === "admin" ? "/admin/products" : "/");

    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    const supabase = createClient();
    const { data: { user: anonUser }, error: anonError } = await supabase.auth.getUser();
    if (anonError) {
      throw new Error(`Failed to get anonymous session: ${anonError.message}`);
    }
    const guestUserId = anonUser?.is_anonymous ? anonUser.id : null;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?guest_id=${guestUserId}`,
      },
    });
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        autoComplete="email"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message && <p className="text-sm text-red-500">{message}</p>}

              <Link
                href="/auth/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot your password?
              </Link>

              <Button type="submit" className="w-full bg-brand" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-md text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
          {/* Google Login */}
          <button
            type="button"
            onClick={googleLogin}
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
