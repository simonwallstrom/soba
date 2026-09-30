import { signOut } from "@client/lib/auth";
import { useState } from "react";

// Pending and error state for a log out control; success leaves the page.
export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function logOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
    } catch {
      setSignOutError("Could not log out. Please try again.");
      setSigningOut(false);
    }
  }

  return { logOut, signingOut, signOutError };
}
