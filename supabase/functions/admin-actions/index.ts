// Lovable Cloud Edge Function — holds the service-role key so the
// externally hosted (Cloudflare) frontend never needs it.
// The TanStack server functions in src/lib/farm.functions.ts call here
// via src/lib/admin-bridge.server.ts, forwarding the user's JWT.
// Auth model:
//   - Verifies bearer JWT via Supabase Auth (service role).
//   - Admin-only actions additionally check user_roles.role='admin'.
//   - "hasAnyAdmin" is the only unauthenticated action (needed by the
//     first-admin claim flow on the login screen).
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PUBLIC_ACTIONS = new Set(["hasAnyAdmin"]);
const USER_ACTIONS = new Set([
  "upload_crop_photo",
  "sign_crop_photo",
  "sign_crop_photos",
  "product_decrement_stock",
  "claim_admin",
]);

async function writeAudit(
  db: ReturnType<typeof admin>,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details: unknown,
) {
  await db.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as never,
  });
}

// ============================================================
// Action handlers
// ============================================================

type Ctx = { db: ReturnType<typeof admin>; userId: string; payload: any };

const handlers: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  // ------- Public -------
  async hasAnyAdmin({ db }) {
    const { count } = await db
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    return { has_any: (count ?? 0) > 0 };
  },

  // ------- User-scoped (auth required, no admin) -------
  async upload_crop_photo({ db, userId, payload }) {
    const { data_url, filename } = payload as { data_url: string; filename?: string };
    const match = data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    const [, mime, b64] = match;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ext = (mime.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, "");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from("crop-photos")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw new Error(error.message);
    return { path, mime, filename: filename ?? null };
  },

  async sign_crop_photo({ db, userId, payload }) {
    const { path, ttl } = payload as { path: string; ttl?: number };
    // Scope: users can only sign their own photo paths (path starts with `${userId}/`).
    if (!path.startsWith(`${userId}/`)) throw new Error("Forbidden");
    const { data, error } = await db.storage
      .from("crop-photos")
      .createSignedUrl(path, ttl ?? 60 * 10);
    if (error) throw new Error(error.message);
    return { signedUrl: data?.signedUrl ?? null };
  },

  async sign_crop_photos({ db, userId, payload }) {
    const { paths, ttl } = payload as { paths: string[]; ttl?: number };
    const out: Record<string, string | null> = {};
    await Promise.all(
      (paths ?? []).map(async (p) => {
        if (!p.startsWith(`${userId}/`)) {
          out[p] = null;
          return;
        }
        const { data } = await db.storage
          .from("crop-photos")
          .createSignedUrl(p, ttl ?? 60 * 30);
        out[p] = data?.signedUrl ?? null;
      }),
    );
    return out;
  },

  async product_decrement_stock({ db, payload }) {
    // Called from placeOrder after the buyer has been debited under RLS.
    // We accept the computed remaining stock — order handler guards over-sell.
    const { product_id, remaining } = payload as {
      product_id: string;
      remaining: number;
    };
    const { error } = await db
      .from("products")
      .update({ stock: Math.max(0, remaining) })
      .eq("id", product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async claim_admin({ db, userId }) {
    const { data: userLookup, error: ulErr } = await db.auth.admin.getUserById(userId);
    if (ulErr || !userLookup?.user) {
      throw new Error(
        "Your session is stale. Please sign out and sign in again with a fresh account.",
      );
    }
    const { count, error: ce } = await db
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (ce) throw new Error(ce.message);
    const hasAny = (count ?? 0) > 0;
    if (hasAny) {
      const { data: mine } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return { is_admin: !!mine };
    }
    await db.from("profiles").upsert(
      {
        id: userId,
        full_name:
          (userLookup.user.user_metadata as any)?.full_name ??
          userLookup.user.email?.split("@")[0] ??
          "Admin",
        onboarded: true,
      },
      { onConflict: "id" },
    );
    const { error: ie } = await db
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (ie) throw new Error(ie.message);
    await writeAudit(db, userId, "admin.claimed", "user", userId, null);
    return { is_admin: true };
  },

  // ------- Admin-only -------
  async admin_overview({ db }) {
    const [
      { data: profiles },
      { data: gardens },
      { data: plots },
      { data: diagnoses },
      { data: orders },
      { data: orderItems },
      { data: products },
      { data: txs },
      { data: consulting },
      { data: certificates },
      { data: modules },
      { data: adminRoles },
    ] = await Promise.all([
      db.from("profiles").select("id, full_name, village, land_size_acres, phone, created_at, onboarded").order("created_at", { ascending: false }),
      db.from("gardens").select("id, user_id, name, size_sqm, location, created_at"),
      db.from("plots").select("id, user_id, garden_id, crop, status, created_at"),
      db.from("diagnoses").select("id, user_id, crop, disease, severity, confidence, created_at").order("created_at", { ascending: false }),
      db.from("orders").select("id, buyer_id, total_cents, status, created_at").order("created_at", { ascending: false }),
      db.from("order_items").select("order_id, product_id, title, qty, unit_price_cents"),
      db.from("products").select("id, title, category, price_cents, unit, stock, seller_id"),
      db.from("wallet_transactions").select("user_id, kind, amount_cents, reason, created_at"),
      db.from("consulting_requests").select("id, user_id, question, crop, reply, replied_at, created_at").order("created_at", { ascending: false }),
      db.from("certificates").select("id, user_id, module_id, issued_at, code"),
      db.from("learning_modules").select("id, title"),
      db.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

    const adminIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));
    const farmerProfiles = (profiles ?? []).filter((p: any) => !adminIds.has(p.id));
    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const farmerTxs = (txs ?? []).filter((t: any) => !adminIds.has(t.user_id));
    const farmerOrders = (orders ?? []).filter((o: any) => !adminIds.has(o.buyer_id));
    const farmerDiagnoses = (diagnoses ?? []).filter((d: any) => !adminIds.has(d.user_id));
    const walletTotal = farmerTxs.reduce(
      (s: number, t: any) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents),
      0,
    );
    const gmv = farmerOrders.reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0);
    const payouts = farmerTxs
      .filter((t: any) => t.kind === "payout")
      .reduce((s: number, t: any) => s + t.amount_cents, 0);

    const diseaseCounts = new Map<string, number>();
    for (const d of diagnoses ?? []) {
      if (!d.disease || d.disease === "Healthy") continue;
      diseaseCounts.set(d.disease, (diseaseCounts.get(d.disease) ?? 0) + 1);
    }
    const topDiseases = [...diseaseCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([disease, count]) => ({ disease, count }));

    const villageCounts = new Map<string, number>();
    for (const p of farmerProfiles) {
      const v = ((p as any).village || "").trim() || "Unspecified";
      villageCounts.set(v, (villageCounts.get(v) ?? 0) + 1);
    }
    const regions = [...villageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([village, count]) => ({ village, count }));

    const gardensByUser = new Map<string, number>();
    for (const g of gardens ?? [])
      gardensByUser.set((g as any).user_id, (gardensByUser.get((g as any).user_id) ?? 0) + 1);
    const plotsByUser = new Map<string, { total: number; growing: number; crops: Set<string> }>();
    for (const pl of plots ?? []) {
      const cur = plotsByUser.get((pl as any).user_id) ?? { total: 0, growing: 0, crops: new Set<string>() };
      cur.total++;
      if ((pl as any).status === "growing") cur.growing++;
      if ((pl as any).crop) cur.crops.add((pl as any).crop);
      plotsByUser.set((pl as any).user_id, cur);
    }
    const walletByUser = new Map<string, number>();
    for (const t of txs ?? []) {
      const cur = walletByUser.get((t as any).user_id) ?? 0;
      walletByUser.set(
        (t as any).user_id,
        cur + ((t as any).kind === "credit" ? (t as any).amount_cents : -(t as any).amount_cents),
      );
    }
    const diagByUser = new Map<string, number>();
    for (const d of diagnoses ?? [])
      diagByUser.set((d as any).user_id, (diagByUser.get((d as any).user_id) ?? 0) + 1);

    const farmers = farmerProfiles.map((p: any) => {
      const pl = plotsByUser.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name || "Unnamed farmer",
        village: p.village || "—",
        land_size_acres: p.land_size_acres ?? 0,
        phone: p.phone || "",
        onboarded: !!p.onboarded,
        gardens: gardensByUser.get(p.id) ?? 0,
        plots: pl?.total ?? 0,
        growing: pl?.growing ?? 0,
        crops: pl ? [...pl.crops] : [],
        wallet_cents: walletByUser.get(p.id) ?? 0,
        diagnoses: diagByUser.get(p.id) ?? 0,
        created_at: p.created_at,
      };
    });

    const recentDiagnoses = (diagnoses ?? []).slice(0, 10).map((d: any) => ({
      id: d.id,
      farmer: (profileById.get(d.user_id) as any)?.full_name || "Farmer",
      village: (profileById.get(d.user_id) as any)?.village || "—",
      crop: d.crop || "—",
      disease: d.disease,
      severity: d.severity,
      confidence: d.confidence,
      created_at: d.created_at,
    }));

    const itemsByOrder = new Map<string, { title: string; qty: number }[]>();
    for (const it of orderItems ?? []) {
      const list = itemsByOrder.get((it as any).order_id) ?? [];
      list.push({ title: (it as any).title, qty: (it as any).qty });
      itemsByOrder.set((it as any).order_id, list);
    }
    const recentOrders = (orders ?? []).slice(0, 10).map((o: any) => ({
      id: o.id,
      farmer: (profileById.get(o.buyer_id) as any)?.full_name || "Farmer",
      village: (profileById.get(o.buyer_id) as any)?.village || "—",
      total_cents: o.total_cents,
      status: o.status,
      items: itemsByOrder.get(o.id) ?? [],
      created_at: o.created_at,
    }));

    const soldByProduct = new Map<string, { qty: number; revenue_cents: number }>();
    for (const it of orderItems ?? []) {
      const cur = soldByProduct.get((it as any).product_id) ?? { qty: 0, revenue_cents: 0 };
      cur.qty += (it as any).qty;
      cur.revenue_cents += (it as any).qty * (it as any).unit_price_cents;
      soldByProduct.set((it as any).product_id, cur);
    }
    const topProducts = (products ?? [])
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        price_cents: p.price_cents,
        unit: p.unit,
        stock: p.stock,
        sold: soldByProduct.get(p.id)?.qty ?? 0,
        revenue_cents: soldByProduct.get(p.id)?.revenue_cents ?? 0,
      }))
      .sort((a: any, b: any) => b.sold - a.sold)
      .slice(0, 8);

    const farmerGardens = (gardens ?? []).filter((g: any) => !adminIds.has(g.user_id));
    const gardensList = farmerGardens.slice(0, 50).map((g: any) => {
      const pl = plotsByUser.get(g.user_id);
      return {
        id: g.id,
        name: g.name,
        location: g.location || (profileById.get(g.user_id) as any)?.village || "—",
        owner: (profileById.get(g.user_id) as any)?.full_name || "Farmer",
        size_sqm: g.size_sqm,
        crops: pl ? [...pl.crops].slice(0, 4) : [],
        growing: pl?.growing ?? 0,
      };
    });

    const consultingQueue = (consulting ?? []).slice(0, 10).map((c: any) => ({
      id: c.id,
      farmer: (profileById.get(c.user_id) as any)?.full_name || "Farmer",
      question: c.question,
      crop: c.crop || "—",
      replied: !!c.replied_at,
      reply: c.reply,
      created_at: c.created_at,
    }));

    const certsByModule = new Map<string, number>();
    for (const c of certificates ?? [])
      certsByModule.set((c as any).module_id, (certsByModule.get((c as any).module_id) ?? 0) + 1);
    const learning = (modules ?? []).map((m: any) => ({
      id: m.id,
      title: m.title,
      issued: certsByModule.get(m.id) ?? 0,
    }));

    const now = Date.now();
    const days: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = dayStart.getTime() + 86400000;
      const count = farmerProfiles.filter((p: any) => {
        const t = new Date(p.created_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd;
      }).length;
      days.push({
        day: dayStart.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      });
    }

    return {
      kpis: {
        farmers: farmerProfiles.length,
        onboarded: farmerProfiles.filter((p: any) => p.onboarded).length,
        gardens: farmerGardens.length,
        plots_growing: (plots ?? []).filter((p: any) => p.status === "growing").length,
        diagnoses: farmerDiagnoses.length,
        orders: farmerOrders.length,
        gmv_cents: gmv,
        wallet_total_cents: walletTotal,
        payouts_cents: payouts,
        certificates: certificates?.length ?? 0,
        consulting_open: (consulting ?? []).filter((c: any) => !c.replied_at).length,
      },
      farmers,
      recentDiagnoses,
      topDiseases,
      regions,
      recentOrders,
      topProducts,
      gardensList,
      consultingQueue,
      learning,
      signups7d: days,
    };
  },

  async farmer_detail({ db, payload }) {
    const uid = payload.user_id as string;
    const [
      { data: profile },
      { data: gardens },
      { data: plots },
      { data: diagnoses },
      { data: txs },
      { data: orders },
      { data: orderItems },
      { data: consulting },
      { data: certificates },
      { data: modules },
    ] = await Promise.all([
      db.from("profiles").select("*").eq("id", uid).maybeSingle(),
      db.from("gardens").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("plots").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      db.from("diagnoses").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("wallet_transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(30),
      db.from("orders").select("*").eq("buyer_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("order_items").select("*"),
      db.from("consulting_requests").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("certificates").select("*").eq("user_id", uid),
      db.from("learning_modules").select("id, title"),
    ]);

    const balance = (txs ?? []).reduce(
      (s: number, t: any) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents),
      0,
    );

    const orderIds = new Set((orders ?? []).map((o: any) => o.id));
    const itemsByOrder = new Map<string, { title: string; qty: number; unit_price_cents: number }[]>();
    for (const it of orderItems ?? []) {
      if (!orderIds.has((it as any).order_id)) continue;
      const list = itemsByOrder.get((it as any).order_id) ?? [];
      list.push({
        title: (it as any).title,
        qty: (it as any).qty,
        unit_price_cents: (it as any).unit_price_cents,
      });
      itemsByOrder.set((it as any).order_id, list);
    }
    const enrichedOrders = (orders ?? []).map((o: any) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    }));

    const modTitle = new Map((modules ?? []).map((m: any) => [m.id, m.title]));
    const enrichedCerts = (certificates ?? []).map((c: any) => ({
      ...c,
      module_title: modTitle.get(c.module_id) ?? "Module",
    }));

    const diagnosesWithUrls = await Promise.all(
      (diagnoses ?? []).map(async (d: any) => {
        const { data: signed } = await db.storage
          .from("crop-photos")
          .createSignedUrl(d.photo_path, 60 * 30);
        return { ...d, photo_url: signed?.signedUrl ?? null };
      }),
    );

    return {
      profile,
      wallet_cents: balance,
      gardens: gardens ?? [],
      plots: plots ?? [],
      diagnoses: diagnosesWithUrls,
      transactions: txs ?? [],
      orders: enrichedOrders,
      consulting: consulting ?? [],
      certificates: enrichedCerts,
    };
  },

  async wallet_top_up({ db, userId, payload }) {
    const { user_id, amount_cents, reason } = payload;
    const { data: farmer } = await db.from("profiles").select("id").eq("id", user_id).maybeSingle();
    if (!farmer) throw new Error("Farmer not found");
    const { error } = await db.from("wallet_transactions").insert({
      user_id,
      kind: "credit",
      amount_cents,
      reason: reason || "Admin wallet top-up",
    });
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "wallet.top_up", "user", user_id, {
      amount_cents,
      reason: reason || "Admin wallet top-up",
    });
    return { ok: true };
  },

  async farmer_delete({ db, userId, payload }) {
    const uid = payload.user_id as string;
    if (uid === userId) throw new Error("Admins cannot delete their own account");
    const { data: orders } = await db.from("orders").select("id").eq("buyer_id", uid);
    const orderIds = (orders ?? []).map((o: any) => o.id);
    if (orderIds.length) await db.from("order_items").delete().in("order_id", orderIds);
    try {
      await db.auth.admin.deleteUser(uid);
    } catch (e) {
      console.error("auth.admin.deleteUser failed", e);
      await db.from("profiles").delete().eq("id", uid);
    }
    await writeAudit(db, userId, "farmer.delete", "user", uid, null);
    return { ok: true };
  },

  async garden_delete({ db, userId, payload }) {
    const id = payload.id as string;
    const { data: plots } = await db.from("plots").select("id").eq("garden_id", id);
    const plotIds = (plots ?? []).map((p: any) => p.id);
    if (plotIds.length) {
      await db.from("garden_events").delete().in("plot_id", plotIds);
      await db.from("plots").delete().in("id", plotIds);
    }
    const { error } = await db.from("gardens").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "garden.delete", "garden", id, null);
    return { ok: true };
  },

  async garden_update({ db, userId, payload }) {
    const { id, ...patch } = payload;
    const { error } = await db.from("gardens").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "garden.update", "garden", id, patch);
    return { ok: true };
  },

  async audit_list({ db }) {
    const [{ data: rows }, { data: profiles }, { data: gardens }] = await Promise.all([
      db.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("profiles").select("id, full_name"),
      db.from("gardens").select("id, name, user_id"),
    ]);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Admin"]));
    const gardenById = new Map((gardens ?? []).map((g: any) => [g.id, g] as const));
    return (rows ?? []).map((r: any) => {
      let target_name: string | null = null;
      let target_owner_id: string | null = null;
      if (r.target_type === "user" && r.target_id) {
        target_name = byId.get(r.target_id) || null;
        target_owner_id = r.target_id;
      } else if (r.target_type === "garden" && r.target_id) {
        const g: any = gardenById.get(r.target_id);
        if (g) {
          target_name = g.name;
          target_owner_id = g.user_id;
        }
      }
      return {
        ...r,
        admin_name: byId.get(r.admin_id) || "Admin",
        target_name,
        target_owner_id,
      };
    });
  },

  async product_list_admin({ db }) {
    const [{ data: products }, { data: profiles }] = await Promise.all([
      db.from("products").select("*").order("created_at", { ascending: false }),
      db.from("profiles").select("id, full_name"),
    ]);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Farmer"]));
    return (products ?? []).map((p: any) => ({
      ...p,
      seller_name: p.seller_id ? byId.get(p.seller_id) ?? "Farmer" : "Platform (Admin)",
    }));
  },

  async product_create_admin({ db, userId, payload }) {
    const hay = `${payload.title} ${payload.category} ${payload.description ?? ""}`.toLowerCase();
    if (!hay.includes("ginger")) {
      throw new Error("Marketplace only accepts ginger and ginger-related products.");
    }
    const { data: row, error } = await db
      .from("products")
      .insert({
        seller_id: null,
        title: payload.title,
        category: payload.category,
        description: payload.description ?? "",
        price_cents: payload.price_cents,
        unit: payload.unit ?? "kg",
        stock: payload.stock ?? 1,
        is_seed: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "product.create", "product", row.id, { title: row.title });
    return row;
  },

  async product_update_admin({ db, userId, payload }) {
    const { id, ...patch } = payload;
    const { error } = await db.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "product.update", "product", id, patch);
    return { ok: true };
  },

  async product_delete_admin({ db, userId, payload }) {
    const { error } = await db.from("products").delete().eq("id", payload.id);
    if (error) throw new Error(error.message);
    await writeAudit(db, userId, "product.delete", "product", payload.id, null);
    return { ok: true };
  },

  async admin_list({ db, userId }) {
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return [];
    const sorted = [...(roles ?? [])].sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const firstAdminId = sorted[0]?.user_id ?? null;
    const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ids);
    const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Admin"]));
    const rows = await Promise.all(
      (roles ?? []).map(async (r: any) => {
        let email: string | null = null;
        try {
          const { data } = await db.auth.admin.getUserById(r.user_id);
          email = data.user?.email ?? null;
        } catch { /* ignore */ }
        return {
          user_id: r.user_id,
          full_name: nameById.get(r.user_id) ?? "Admin",
          email,
          created_at: r.created_at,
          is_self: r.user_id === userId,
          is_first: r.user_id === firstAdminId,
        };
      }),
    );
    return rows;
  },

  async admin_create({ db, userId, payload }) {
    const { data: created, error } = await db.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.full_name ?? "Admin" },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    await db
      .from("profiles")
      .upsert({ id: uid, full_name: payload.full_name ?? "Admin", onboarded: true }, { onConflict: "id" });
    const { error: re } = await db.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (re) throw new Error(re.message);
    await writeAudit(db, userId, "admin.create", "user", uid, { email: payload.email });
    return { ok: true, user_id: uid };
  },

  async admin_delete({ db, userId, payload }) {
    const { data: roles } = await db
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1);
    const firstAdminId = (roles as any)?.[0]?.user_id ?? null;
    if (firstAdminId && payload.user_id === firstAdminId) {
      throw new Error("The first admin account cannot be deleted.");
    }
    try {
      await db.auth.admin.deleteUser(payload.user_id);
    } catch (e) {
      console.error("auth.admin.deleteUser failed", e);
      await db.from("user_roles").delete().eq("user_id", payload.user_id);
      await db.from("profiles").delete().eq("id", payload.user_id);
    }
    await writeAudit(db, userId, "admin.delete", "user", payload.user_id, null);
    return { ok: true };
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const db = admin();

  let body: { action?: string; payload?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = String(body.action ?? "");
  const handler = handlers[action];
  if (!handler) return json({ error: `Unknown action: ${action}` }, 400);

  // Public action bypass
  if (PUBLIC_ACTIONS.has(action)) {
    try {
      const result = await handler({ db, userId: "", payload: body.payload ?? {} });
      return json(result);
    } catch (e: any) {
      return json({ error: e?.message ?? String(e) }, 400);
    }
  }

  // Auth-required
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: userData, error: uerr } = await db.auth.getUser(token);
  if (uerr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  // Admin-only actions require role check
  if (!USER_ACTIONS.has(action)) {
    const { data: role } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Forbidden: admin only" }, 403);
  }

  try {
    const result = await handler({ db, userId, payload: body.payload ?? {} });
    return json(result);
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 400);
  }
});