"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="btn btn-ghost btn-sm gap-2">
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
