import CartMerger from "./CartMerger";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gray-50">
      <CartMerger />
      <div className="w-full max-w-sm">
        <Card className="text-center shadow-lg rounded-xl">
          <CardHeader className="flex flex-col items-center gap-4">
            <Image
              src="/images/logo.png"
              alt="Email sent"
              width={120}
              height={120}
              priority
            />
            <CardTitle className="text-2xl font-semibold">
              Check your email 📩
            </CardTitle>

            <CardDescription>
              We’ve sent you a confirmation link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your account has been created successfully. Please check your
              inbox and click the confirmation link to activate your account.
            </p>

            {/* CTA */}
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to Login</Link>
            </Button>


          </CardContent>
        </Card>
      </div>
    </div>
  );
}