// app/protected/page.tsx

import { Suspense } from "react";
import { InfoIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/users";

async function UserDetails() {
  const user = await getCurrentUser();

  return (
    <pre className="text-xs font-mono p-3 rounded border max-h-96 overflow-auto">
      {JSON.stringify(user, null, 2)}
    </pre>
  );
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="bg-accent p-3 rounded-md flex gap-3 items-center">
        <InfoIcon size="16" />
        Protected page
      </div>

      <div>
        <h2 className="font-bold text-2xl mb-4">User Details</h2>

        <Suspense fallback={<p>Loading user...</p>}>
          <UserDetails />
        </Suspense>
      </div>
    </div>
  );
}
