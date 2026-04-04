"use client";

import { useEffect } from "react";
import { ensureAnonymousUser } from "@/lib/supabase/anon-user";

export default function EnsureAnonSession() {
  useEffect(() => {
    void ensureAnonymousUser().catch((err) => {
      console.error("Anonymous auth failed:", err);
    });
  }, []);

  return null;
}