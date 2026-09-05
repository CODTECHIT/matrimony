import { useState } from "react";
import { toast } from "sonner";
import { authService } from "@/services";
import { env } from "@/lib/env";

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      const { url } = await authService.googleAuthUrl();
      if (url) {
        window.location.href = url;
        return;
      }
      toast.info(
        env.googleClientId
          ? "Google sign-in will be enabled once the backend OAuth endpoint is live."
          : "Google sign-in demo: Click 'Login with phone' or enter credentials.",
      );
    } catch {
      toast.error("Could not start Google sign-in. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-[#D92662] hover:bg-[#C2185B] px-4 text-base font-semibold text-white shadow-md shadow-rose-900/15 transition-all disabled:opacity-70 active:scale-[0.99]"
    >
      <GoogleGlyph />
      <span>{pending ? "Connecting…" : label}</span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white shadow-xs">
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
        />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path
          fill="#EA4335"
          d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
        />
      </svg>
    </span>
  );
}
