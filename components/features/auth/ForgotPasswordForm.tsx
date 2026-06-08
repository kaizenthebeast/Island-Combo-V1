"use client";
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
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import Link from "next/link";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  ForgotPasswordFormInput,
} from "@/lib/validations/forgot-password";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

const onSubmit: SubmitHandler<ForgotPasswordFormInput> = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email }),
        });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.message || 'Something went wrong');
        }

        setSuccess(true);
    } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
        setIsLoading(false);
    }
};

  return (
    <div className="w-full max-w-md mx-auto space-y-6 flex flex-col justify-center">
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl">
            {success ? "Check your email" : "Reset your password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you registered with your email and password, you&apos;ll
                receive a link to reset your password shortly.
              </p>
              <Link
                href="/auth/login"
                className="inline-block text-sm underline underline-offset-4"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
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

                {error && <p className="text-sm text-danger">{error}</p>}

                <Button type="submit" className="w-full bg-brand" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset email"}
                </Button>

                <div className="mt-4 text-center text-sm">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    Login
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
