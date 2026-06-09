'use client'
/** Client provider that ensures an anonymous session. */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureAnonymousUser } from '@/shared/lib/db/anon-user';
import { createClient } from "@/shared/lib/db/client";

export default function AnonAuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        // Don't create anonymous session on auth pages
        if (pathname.startsWith("/auth")) return;

        const init = async () => {
            const supabase = createClient();

            // Wait for Supabase to settle its auth state before acting
            const { data: { session } } = await supabase.auth.getSession();

            // Already have a real user 
            if (session?.user && !session.user.is_anonymous) return;

            await ensureAnonymousUser().catch((err) =>
                console.error('Anon auth failed:', err)
            );
        };

        init();
    }, [pathname]); // Re-runs on navigation, but guards prevent misuse

    return <>{children}</>;
}