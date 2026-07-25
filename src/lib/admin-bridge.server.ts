// Server-only helper — invokes the Lovable Cloud `admin-actions` Edge Function.
// Lets TanStack server functions execute privileged operations without
// needing SUPABASE_SERVICE_ROLE_KEY on the externally hosted Cloudflare
// worker. The user's bearer token is forwarded so the Edge Function can
// verify identity + admin role.
// Filename ends in .server.ts so the client bundle can never import it.
import { getRequestHeader } from "@tanstack/react-start/server";

function edgeUrl() {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error("Missing SUPABASE_URL");
  return `${base.replace(/\/$/, "")}/functions/v1/admin-actions`;
}

function publishableKey(): string {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_PUBLISHABLE_KEY");
  return key;
}

export type AdminAction =
  | "hasAnyAdmin"
  | "upload_crop_photo"
  | "sign_crop_photo"
  | "sign_crop_photos"
  | "product_decrement_stock"
  | "claim_admin"
  | "admin_overview"
  | "farmer_detail"
  | "wallet_top_up"
  | "farmer_delete"
  | "garden_delete"
  | "garden_update"
  | "audit_list"
  | "product_list_admin"
  | "product_create_admin"
  | "product_update_admin"
  | "product_delete_admin"
  | "admin_list"
  | "admin_create"
  | "admin_delete";

/**
 * Call the admin-actions Edge Function.
 * - `hasAnyAdmin` is public; all other actions require the caller's JWT.
 * - When called inside a server function that used `requireSupabaseAuth`,
 *   the incoming request's Authorization header is forwarded automatically.
 */
// deno-lint-ignore-file no-explicit-any
// Default T = any so TanStack server-fn return-type inference stays serializable-friendly.
export async function callAdmin<T = any>(
  action: AdminAction,
  payload: Record<string, unknown> = {},
  opts: { requireAuth?: boolean } = {},
): Promise<T> {
  const requireAuth = opts.requireAuth ?? action !== "hasAnyAdmin";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: publishableKey(),
  };
  if (requireAuth) {
    const auth = getRequestHeader("authorization");
    if (!auth) throw new Error("Unauthorized: missing bearer token");
    headers["Authorization"] = auth;
  } else {
    // Edge functions still expect an Authorization header when verify_jwt=false
    // is not set; publishable key satisfies gateway auth.
    headers["Authorization"] = `Bearer ${publishableKey()}`;
  }

  const resp = await fetch(edgeUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload }),
  });
  const text = await resp.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!resp.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as { error: string }).error
        : `admin-actions ${resp.status}`) || `admin-actions ${resp.status}`;
    throw new Error(msg);
  }
  return parsed as T;
}