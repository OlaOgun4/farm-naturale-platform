import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Admin helpers ----------

type AuthCtx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };

async function assertAdmin(context: AuthCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Permission check failed");
  if (!data) throw new Error("Forbidden: admin only");
}

async function logAdmin(adminId: string, action: string, targetType: string, targetId: string, details: unknown) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as never,
  });
}

// ---------- Profile ----------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, balance, { data: authUser }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("kind, amount_cents")
        .eq("user_id", userId),
      supabase.auth.getUser(),
    ]);
    const bal = (balance.data ?? []).reduce((sum, t) => {
      if (t.kind === "credit") return sum + t.amount_cents;
      return sum - t.amount_cents;
    }, 0);
    return {
      profile,
      email: authUser.user?.email ?? null,
      wallet_cents: bal,
    };
  });

const OnboardingSchema = z.object({
  full_name: z.string().min(1),
  farm_name: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  village: z.string().optional().default(""),
  land_size_acres: z.number().optional().default(0),
  crops_of_interest: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => OnboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, onboarded: true, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Dashboard summary ----------

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [gardens, plots, diagnoses, txs] = await Promise.all([
      supabase.from("gardens").select("id").eq("user_id", userId),
      supabase.from("plots").select("id, status").eq("user_id", userId),
      supabase.from("diagnoses").select("id, disease, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
      supabase.from("wallet_transactions").select("kind, amount_cents").eq("user_id", userId),
    ]);
    const bal = (txs.data ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
    return {
      gardens: gardens.data?.length ?? 0,
      plots: plots.data?.length ?? 0,
      growing: plots.data?.filter((p) => p.status === "growing").length ?? 0,
      wallet_cents: bal,
      recent_diagnoses: diagnoses.data ?? [],
    };
  });

// ---------- Gardens & plots ----------

export const listGardens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: gardens } = await supabase
      .from("gardens")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const { data: plots } = await supabase
      .from("plots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { gardens: gardens ?? [], plots: plots ?? [] };
  });

export const createGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ name: z.string().min(1), size_sqm: z.number().optional(), location: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("gardens")
      .insert({ user_id: userId, name: data.name, size_sqm: data.size_sqm ?? null, location: data.location ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addPlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ garden_id: z.string().uuid(), crop: z.string().min(1), area_sqm: z.number().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("plots")
      .insert({ garden_id: data.garden_id, user_id: userId, crop: data.crop, area_sqm: data.area_sqm ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const logGardenEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ plot_id: z.string().uuid(), kind: z.string(), note: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("garden_events")
      .insert({ plot_id: data.plot_id, user_id: userId, kind: data.kind, note: data.note ?? null });
    if (error) throw new Error(error.message);
    // Harvested → mark plot harvested + credit wallet mock harvest
    if (data.kind === "harvested") {
      await supabase.from("plots").update({ status: "harvested" }).eq("id", data.plot_id).eq("user_id", userId);
    }
    return { ok: true };
  });

export const listPlotEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ plot_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("garden_events")
      .select("*")
      .eq("user_id", userId)
      .eq("plot_id", data.plot_id)
      .order("occurred_at", { ascending: false });
    return rows ?? [];
  });

// ---------- AI Crop Doctor ----------

export const uploadCropPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ data_url: z.string().startsWith("data:"), filename: z.string().default("leaf.jpg") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const match = data.data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    const [, mime, b64] = match;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = mime.split("/")[1] ?? "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("crop-photos").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    return { path, mime };
  });

export const diagnoseCropPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ photo_path: z.string(), crop: z.string().optional().default("") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("crop-photos")
      .createSignedUrl(data.photo_path, 60 * 10);
    if (!signed?.signedUrl) throw new Error("Photo not found");

    // Fetch image, convert to base64 data URL for the model
    const imgResp = await fetch(signed.signedUrl);
    const imgBuf = new Uint8Array(await imgResp.arrayBuffer());
    const imgB64 = btoa(String.fromCharCode(...imgBuf));
    const contentType = imgResp.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${contentType};base64,${imgB64}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert plant pathologist specializing in ginger (Zingiber officinale) for smallholder farmers in Nigeria. Analyze the plant photo and reply with STRICT JSON only, matching: {\"disease\":string,\"confidence\":number(0-1),\"severity\":\"mild\"|\"moderate\"|\"severe\"|\"none\",\"treatment\":string,\"prevention\":string,\"summary\":string}. If the plant looks healthy, use disease:\"Healthy\" and severity:\"none\". Keep treatment and prevention practical and organic-first, using inputs available to Nigerian smallholder ginger farmers. Do not wrap in code fences.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Crop context: ${data.crop || "Ginger"}. Diagnose the visible issue and give organic-first treatment and prevention advice for a smallholder ginger farmer in Nigeria.`,
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI diagnosis failed (${resp.status}): ${t.slice(0, 200)}`);
    }
    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { disease: "Unknown", confidence: 0, severity: "none", summary: raw };
    }

    const row = {
      user_id: userId,
      photo_path: data.photo_path,
      crop: data.crop || null,
      disease: String(parsed.disease ?? "Unknown"),
      confidence: Number(parsed.confidence ?? 0),
      severity: String(parsed.severity ?? "none"),
      treatment: String(parsed.treatment ?? ""),
      prevention: String(parsed.prevention ?? ""),
      summary: String(parsed.summary ?? ""),
    };
    const { data: saved, error } = await supabase.from("diagnoses").insert(row).select().single();
    if (error) throw new Error(error.message);
    return saved;
  });

export const listDiagnoses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("diagnoses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    // Sign photo URLs for display
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out = await Promise.all(
      (data ?? []).map(async (d) => {
        const { data: url } = await supabaseAdmin.storage
          .from("crop-photos")
          .createSignedUrl(d.photo_path, 60 * 30);
        return { ...d, photo_url: url?.signedUrl ?? null };
      }),
    );
    return out;
  });

// ---------- Marketplace ----------

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("products")
      .select("*")
      .or("title.ilike.%ginger%,category.ilike.%ginger%,description.ilike.%ginger%")
      .gt("stock", 0)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional().default(""),
        price_cents: z.number().int().nonnegative(),
        unit: z.string().default("kg"),
        stock: z.number().int().nonnegative().default(1),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const hay = `${data.title} ${data.category} ${data.description}`.toLowerCase();
    if (!hay.includes("ginger")) {
      throw new Error("Marketplace only accepts ginger and ginger-related products. Please include 'ginger' in the title, category or description.");
    }
    // Sellers must have at least one harvested plot event before listing produce.
    const { count: harvests } = await supabase
      .from("garden_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "harvested");
    if (!harvests || harvests <= 0) {
      throw new Error("You can only sell products after logging a harvest. Go to My Garden, plant ginger, and tap Harvest first.");
    }
    const { data: row, error } = await supabase
      .from("products")
      .insert({
        seller_id: userId,
        title: data.title,
        category: data.category,
        description: data.description,
        price_cents: data.price_cents,
        unit: data.unit,
        stock: data.stock,
        is_seed: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ product_id: z.string().uuid(), qty: z.number().int().positive() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: product, error: pe } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.product_id)
      .single();
    if (pe || !product) throw new Error("Product not found");

    if ((product.stock ?? 0) < data.qty) throw new Error("Sold out — this item is no longer available.");

    const total = product.price_cents * data.qty;

    // Check wallet
    const { data: txs } = await supabase.from("wallet_transactions").select("kind, amount_cents").eq("user_id", userId);
    const balance = (txs ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
    if (balance < total) throw new Error(`Insufficient wallet balance. Need ₦${(total / 100).toFixed(0)}, have ₦${(balance / 100).toFixed(0)}.`);

    const { data: order, error: oe } = await supabase
      .from("orders")
      .insert({ buyer_id: userId, total_cents: total, status: "paid" })
      .select()
      .single();
    if (oe) throw new Error(oe.message);

    const { error: ie } = await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      qty: data.qty,
      unit_price_cents: product.price_cents,
      title: product.title,
    });
    if (ie) throw new Error(ie.message);

    await supabase.from("wallet_transactions").insert({
      user_id: userId,
      kind: "debit",
      amount_cents: total,
      reason: `Order: ${product.title} × ${data.qty}`,
      ref_id: order.id,
    });

    // Decrement product stock so sold-out items disappear from marketplace.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const remainingStock = Math.max(0, (product.stock ?? 0) - data.qty);
    await supabaseAdmin
      .from("products")
      .update({ stock: remainingStock })
      .eq("id", product.id);

    return {
      ...order,
      receipt: {
        product_title: product.title,
        unit: product.unit,
        unit_price_cents: product.price_cents,
        qty: data.qty,
        total_cents: total,
        remaining_stock: remainingStock,
      },
    };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

// ---------- Wallet ----------

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const balance = (data ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
    return { balance_cents: balance, transactions: data ?? [] };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ amount_cents: z.number().int().positive() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: txs } = await supabase.from("wallet_transactions").select("kind, amount_cents").eq("user_id", userId);
    const balance = (txs ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
    if (balance < data.amount_cents) throw new Error("Insufficient balance for payout");
    const { error } = await supabase.from("wallet_transactions").insert({
      user_id: userId,
      kind: "payout",
      amount_cents: data.amount_cents,
      reason: "Payout requested to bank",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Consulting ----------

export const submitConsultingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ question: z.string().min(3), crop: z.string().optional().default("") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("consulting_requests")
      .insert({ user_id: userId, question: data.question, crop: data.crop || null })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Generate AI reply
    const apiKey = process.env.LOVABLE_API_KEY;
    if (apiKey) {
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You are Amara, a friendly Farm Naturale agronomist specializing in ginger farming. Answer smallholder farmer questions in 3-5 concise sentences, practical and organic-first. Use Nigerian context and mention Naira (₦) when prices come up.",
              },
              { role: "user", content: `Crop: ${data.crop || "not specified"}. Question: ${data.question}` },
            ],
          }),
        });
        if (resp.ok) {
          const j = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
          const reply = j.choices?.[0]?.message?.content ?? "Our agronomist will get back to you shortly.";
          await supabase
            .from("consulting_requests")
            .update({ reply, replied_at: new Date().toISOString() })
            .eq("id", row.id);
          row.reply = reply;
          row.replied_at = new Date().toISOString();
        }
      } catch (e) {
        console.error("consulting AI reply failed", e);
      }
    }
    return row;
  });

export const listConsultingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("consulting_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

// ---------- Learning & Certificates ----------

export const listModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: mods }, { data: certs }] = await Promise.all([
      supabase.from("learning_modules").select("*").order("created_at"),
      supabase.from("certificates").select("*").eq("user_id", userId),
    ]);
    const completed = new Set((certs ?? []).map((c) => c.module_id));
    return {
      modules: (mods ?? []).map((m) => ({ ...m, completed: completed.has(m.id) })),
      certificates: certs ?? [],
    };
  });

export const completeModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ module_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cert, error } = await supabase
      .from("certificates")
      .upsert({ user_id: userId, module_id: data.module_id }, { onConflict: "user_id,module_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return cert;
  });

// ---------- Admin overview (aggregate, demo) ----------

export const getAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, village, land_size_acres, phone, created_at, onboarded").order("created_at", { ascending: false }),
    supabaseAdmin.from("gardens").select("id, user_id, name, size_sqm, location, created_at"),
    supabaseAdmin.from("plots").select("id, user_id, garden_id, crop, status, created_at"),
    supabaseAdmin.from("diagnoses").select("id, user_id, crop, disease, severity, confidence, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("orders").select("id, buyer_id, total_cents, status, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("order_items").select("order_id, product_id, title, qty, unit_price_cents"),
    supabaseAdmin.from("products").select("id, title, category, price_cents, unit, stock, seller_id"),
    supabaseAdmin.from("wallet_transactions").select("user_id, kind, amount_cents, reason, created_at"),
    supabaseAdmin.from("consulting_requests").select("id, user_id, question, crop, reply, replied_at, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("certificates").select("id, user_id, module_id, issued_at, code"),
    supabaseAdmin.from("learning_modules").select("id, title"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));

  const walletTotal = (txs ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
  const gmv = (orders ?? []).reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const payouts = (txs ?? []).filter((t) => t.kind === "payout").reduce((s, t) => s + t.amount_cents, 0);

  // Disease frequency
  const diseaseCounts = new Map<string, number>();
  for (const d of diagnoses ?? []) {
    if (!d.disease || d.disease === "Healthy") continue;
    diseaseCounts.set(d.disease, (diseaseCounts.get(d.disease) ?? 0) + 1);
  }
  const topDiseases = [...diseaseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([disease, count]) => ({ disease, count }));

  // Region rollup by village
  const villageCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    const v = (p.village || "").trim() || "Unspecified";
    villageCounts.set(v, (villageCounts.get(v) ?? 0) + 1);
  }
  const regions = [...villageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([village, count]) => ({ village, count }));

  // Farmers list with rollups
  const gardensByUser = new Map<string, number>();
  for (const g of gardens ?? []) gardensByUser.set(g.user_id, (gardensByUser.get(g.user_id) ?? 0) + 1);
  const plotsByUser = new Map<string, { total: number; growing: number; crops: Set<string> }>();
  for (const pl of plots ?? []) {
    const cur = plotsByUser.get(pl.user_id) ?? { total: 0, growing: 0, crops: new Set<string>() };
    cur.total++;
    if (pl.status === "growing") cur.growing++;
    if (pl.crop) cur.crops.add(pl.crop);
    plotsByUser.set(pl.user_id, cur);
  }
  const walletByUser = new Map<string, number>();
  for (const t of txs ?? []) {
    const cur = walletByUser.get(t.user_id) ?? 0;
    walletByUser.set(t.user_id, cur + (t.kind === "credit" ? t.amount_cents : -t.amount_cents));
  }
  const diagByUser = new Map<string, number>();
  for (const d of diagnoses ?? []) diagByUser.set(d.user_id, (diagByUser.get(d.user_id) ?? 0) + 1);

  const farmers = (profiles ?? []).map((p) => {
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

  // Recent diagnostics with farmer name
  const recentDiagnoses = (diagnoses ?? []).slice(0, 10).map((d) => ({
    id: d.id,
    farmer: profileById.get(d.user_id)?.full_name || "Farmer",
    village: profileById.get(d.user_id)?.village || "—",
    crop: d.crop || "—",
    disease: d.disease,
    severity: d.severity,
    confidence: d.confidence,
    created_at: d.created_at,
  }));

  // Recent orders with farmer + items
  const itemsByOrder = new Map<string, { title: string; qty: number }[]>();
  for (const it of orderItems ?? []) {
    const list = itemsByOrder.get(it.order_id) ?? [];
    list.push({ title: it.title, qty: it.qty });
    itemsByOrder.set(it.order_id, list);
  }
  const recentOrders = (orders ?? []).slice(0, 10).map((o) => ({
    id: o.id,
    farmer: profileById.get(o.buyer_id)?.full_name || "Farmer",
    village: profileById.get(o.buyer_id)?.village || "—",
    total_cents: o.total_cents,
    status: o.status,
    items: itemsByOrder.get(o.id) ?? [],
    created_at: o.created_at,
  }));

  // Product performance
  const soldByProduct = new Map<string, { qty: number; revenue_cents: number }>();
  for (const it of orderItems ?? []) {
    const cur = soldByProduct.get(it.product_id) ?? { qty: 0, revenue_cents: 0 };
    cur.qty += it.qty;
    cur.revenue_cents += it.qty * it.unit_price_cents;
    soldByProduct.set(it.product_id, cur);
  }
  const topProducts = (products ?? [])
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      price_cents: p.price_cents,
      unit: p.unit,
      stock: p.stock,
      sold: soldByProduct.get(p.id)?.qty ?? 0,
      revenue_cents: soldByProduct.get(p.id)?.revenue_cents ?? 0,
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  // Gardens with owner
  const gardensList = (gardens ?? []).slice(0, 12).map((g) => {
    const pl = plotsByUser.get(g.user_id);
    return {
      id: g.id,
      name: g.name,
      location: g.location || profileById.get(g.user_id)?.village || "—",
      owner: profileById.get(g.user_id)?.full_name || "Farmer",
      size_sqm: g.size_sqm,
      crops: pl ? [...pl.crops].slice(0, 4) : [],
      growing: pl?.growing ?? 0,
    };
  });

  // Consulting queue with farmer name
  const consultingQueue = (consulting ?? []).slice(0, 10).map((c) => ({
    id: c.id,
    farmer: profileById.get(c.user_id)?.full_name || "Farmer",
    question: c.question,
    crop: c.crop || "—",
    replied: !!c.replied_at,
    reply: c.reply,
    created_at: c.created_at,
  }));

  // Learning progress rollup
  const certsByModule = new Map<string, number>();
  for (const c of certificates ?? []) certsByModule.set(c.module_id, (certsByModule.get(c.module_id) ?? 0) + 1);
  const learning = (modules ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    issued: certsByModule.get(m.id) ?? 0,
  }));

  // Signups over last 7 days
  const now = Date.now();
  const days: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + 86400000;
    const count = (profiles ?? []).filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= dayStart.getTime() && t < dayEnd;
    }).length;
    days.push({ day: dayStart.toLocaleDateString(undefined, { weekday: "short" }), count });
  }

  return {
    kpis: {
      farmers: profiles?.length ?? 0,
      onboarded: (profiles ?? []).filter((p) => p.onboarded).length,
      gardens: gardens?.length ?? 0,
      plots_growing: (plots ?? []).filter((p) => p.status === "growing").length,
      diagnoses: diagnoses?.length ?? 0,
      orders: orders?.length ?? 0,
      gmv_cents: gmv,
      wallet_total_cents: walletTotal,
      payouts_cents: payouts,
      certificates: certificates?.length ?? 0,
      consulting_open: (consulting ?? []).filter((c) => !c.replied_at).length,
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
});

// ---------- Admin: impersonation / farmer detail ----------

export const getFarmerDetail = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;
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
      supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("gardens").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabaseAdmin.from("plots").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      supabaseAdmin.from("diagnoses").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("wallet_transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(30),
      supabaseAdmin.from("orders").select("*").eq("buyer_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("order_items").select("*"),
      supabaseAdmin.from("consulting_requests").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("certificates").select("*").eq("user_id", uid),
      supabaseAdmin.from("learning_modules").select("id, title"),
    ]);

    const balance = (txs ?? []).reduce(
      (s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents),
      0,
    );

    const orderIds = new Set((orders ?? []).map((o) => o.id));
    const itemsByOrder = new Map<string, { title: string; qty: number; unit_price_cents: number }[]>();
    for (const it of orderItems ?? []) {
      if (!orderIds.has(it.order_id)) continue;
      const list = itemsByOrder.get(it.order_id) ?? [];
      list.push({ title: it.title, qty: it.qty, unit_price_cents: it.unit_price_cents });
      itemsByOrder.set(it.order_id, list);
    }
    const enrichedOrders = (orders ?? []).map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    }));

    const modTitle = new Map((modules ?? []).map((m) => [m.id, m.title]));
    const enrichedCerts = (certificates ?? []).map((c) => ({
      ...c,
      module_title: modTitle.get(c.module_id) ?? "Module",
    }));

    // Signed URLs for diagnosis photos
    const diagnosesWithUrls = await Promise.all(
      (diagnoses ?? []).map(async (d) => {
        const { data: signed } = await supabaseAdmin.storage
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
  });

// ---------- User CRUD: profile & gardens ----------

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        full_name: z.string().min(1).optional(),
        farm_name: z.string().optional(),
        phone: z.string().optional(),
        village: z.string().optional(),
        land_size_acres: z.number().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        size_sqm: z.number().nullable().optional(),
        location: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("gardens").update(patch).eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Delete events + plots first (in case cascade not set)
    const { data: plots } = await supabase.from("plots").select("id").eq("garden_id", data.id).eq("user_id", userId);
    const plotIds = (plots ?? []).map((p) => p.id);
    if (plotIds.length) {
      await supabase.from("garden_events").delete().in("plot_id", plotIds);
      await supabase.from("plots").delete().in("id", plotIds);
    }
    const { error } = await supabase.from("gardens").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("garden_events").delete().eq("plot_id", data.id);
    const { error } = await supabase.from("plots").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin actions ----------

export const adminTopUpWallet = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        amount_cents: z.number().int().positive(),
        reason: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: data.user_id,
      kind: "credit",
      amount_cents: data.amount_cents,
      reason: data.reason || "Admin wallet top-up",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteFarmer = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.user_id;
    const { data: orders } = await supabaseAdmin.from("orders").select("id").eq("buyer_id", uid);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length) await supabaseAdmin.from("order_items").delete().in("order_id", orderIds);
    await supabaseAdmin.from("orders").delete().eq("buyer_id", uid);
    await supabaseAdmin.from("garden_events").delete().eq("user_id", uid);
    await supabaseAdmin.from("plots").delete().eq("user_id", uid);
    await supabaseAdmin.from("gardens").delete().eq("user_id", uid);
    await supabaseAdmin.from("diagnoses").delete().eq("user_id", uid);
    await supabaseAdmin.from("wallet_transactions").delete().eq("user_id", uid);
    await supabaseAdmin.from("consulting_requests").delete().eq("user_id", uid);
    await supabaseAdmin.from("certificates").delete().eq("user_id", uid);
    await supabaseAdmin.from("products").delete().eq("seller_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);
    try {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    } catch (e) {
      console.error("auth.admin.deleteUser failed", e);
    }
    return { ok: true };
  });

export const adminDeleteGarden = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plots } = await supabaseAdmin.from("plots").select("id").eq("garden_id", data.id);
    const plotIds = (plots ?? []).map((p) => p.id);
    if (plotIds.length) {
      await supabaseAdmin.from("garden_events").delete().in("plot_id", plotIds);
      await supabaseAdmin.from("plots").delete().in("id", plotIds);
    }
    const { error } = await supabaseAdmin.from("gardens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });