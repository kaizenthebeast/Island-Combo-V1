import { SignUpForm } from "@/components/forms/sign-up-form";
import Image from "next/image";


export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-5xl">

        <Image
          width={361}
          height={361}
          src="/images/logo.png"
          alt="Logo"
          loading="eager"
          className="object-contain"
        />

        <SignUpForm />
      </div>
    </div>
  );
}
