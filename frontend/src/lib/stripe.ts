import { loadStripe } from "@stripe/stripe-js";

import { apiUrl } from "@/lib/api";

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

export async function initiateCheckout() {
  const response = await fetch(apiUrl("/api/stripe/checkout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success_url: `${window.location.origin}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}?payment=cancelled`,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to start checkout. Please try again.",
    );
  }

  window.open(data.checkout_url, "_blank");
}

const RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

export async function fetchTokenBySessionId(
  sessionId: string,
): Promise<{ token: string; expires_at: string } | null> {
  const response = await fetch(
    apiUrl(`/api/stripe/token?session_id=${encodeURIComponent(sessionId)}`),
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Unable to retrieve session token.",
    );
  }

  return response.json();
}

export async function retrieveToken(
  sessionId: string,
): Promise<{ token: string; expires_at: string }> {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const result = await fetchTokenBySessionId(sessionId);
    if (result) {
      return result;
    }
    if (attempt < RETRY_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new Error(
    "Payment verified but token issuance is taking longer than expected. Please refresh the page.",
  );
}

export function storeToken(token: string, expires_at: string) {
  sessionStorage.setItem("cr_token", token);
  sessionStorage.setItem("cr_token_expires", expires_at);
  sessionStorage.setItem("cr_query_count", "0");
}

export function getStoredToken(): string | null {
  const token = sessionStorage.getItem("cr_token");
  const expires = sessionStorage.getItem("cr_token_expires");
  if (!token || !expires) return null;
  if (new Date(expires) < new Date()) {
    clearToken();
    return null;
  }
  return token;
}

export function clearToken() {
  sessionStorage.removeItem("cr_token");
  sessionStorage.removeItem("cr_token_expires");
  sessionStorage.removeItem("cr_query_count");
}

export function getRemainingQueries(): number {
  const count = parseInt(sessionStorage.getItem("cr_query_count") || "0", 10);
  const limit = 10;
  return Math.max(0, limit - count);
}

export function incrementLocalQueryCount() {
  const count = parseInt(sessionStorage.getItem("cr_query_count") || "0", 10);
  sessionStorage.setItem("cr_query_count", String(count + 1));
}
