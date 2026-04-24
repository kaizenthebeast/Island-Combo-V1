'use client'

import { useEffect } from "react";
import { ensureAnonymousUser } from '@/lib/supabase/anon-user';

export default function AnonAuthProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        ensureAnonymousUser().catch((err) => console.error('Anon auth failed:', err));
        console.log('session anon');
    }, []);
    return <>{children}</>;
}       