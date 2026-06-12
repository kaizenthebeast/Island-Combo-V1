"use client";

import { cn } from "@/shared/utils/cn";
import { createClient } from "@/shared/lib/db/client";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePasswordSchema,
  UpdatePasswordFormInput,
} from "@/features/auth/validations/update-password";

// The link must have produced a real session before the form is usable:
// every visitor holds an anonymous guest session (cart), and updating the
// password of an anonymous user is a GoTrue 422 — so a consumed/expired
// email link would otherwise fail with a cryptic error only on submit.
type LinkState = "checking" | "ready" | "invalid";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<UpdatePasswordFormInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // GoTrue reports verification failures (consumed / expired links) as
    // #error_description=... on the redirect instead of a session.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashError = hash.get("error_description") ?? hash.get("error");

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user && !session.user.is_anonymous) {
        setLinkState("ready");
      } else {
        setLinkError(hashError);
        setLinkState("invalid");
      }
    };
    check();

    // The session from the email link can land a tick after the first check
    // (URL-fragment processing) — upgrade to the form when it arrives.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user && !session.user.is_anonymous) setLinkState("ready");
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit: SubmitHandler<UpdatePasswordFormInput> = async (data) => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      // Route by role, mirroring login: invited staff/admin land in the back
      // office, customers (password reset) on the storefront.
      const { data: claims } = await supabase.auth.getClaims();
      const role = claims?.claims?.user_role;
      const isBackOffice = role === "admin" || role === "staff";
      router.push(isBackOffice ? "/admin/dashboard" : "/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred";
      // GoTrue's "Require current password when changing password" toggle
      // breaks email-link flows: invitees and reset users have no current
      // password. Surface the misconfiguration instead of the raw error.
      setError(
        /current password/i.test(message)
          ? "Passwords can't be set from an email link while 'Require current password when changing password' is enabled in Supabase Auth settings — disable it and try again."
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (linkState === "checking") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Verifying your link…</CardTitle>
            <CardDescription>This should only take a moment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (linkState === "invalid") {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              This link is invalid or has expired
            </CardTitle>
            <CardDescription>
              Email links can only be used once and expire after a while.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {linkError && (
              <p className="text-sm text-danger">{linkError}</p>
            )}
            <p className="text-sm text-muted-foreground">
              If you were invited to the team, ask your administrator to send a
              new invitation. If you were resetting your password, request a
              new reset email below.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/forgot-password">Request a new reset email</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="New password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save new password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
