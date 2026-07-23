import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAdmin } from "./admin-bridge.server";

// ---------- Admin helpers ----------

type AuthCtx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };

async function assertAdmin(context: AuthCtx) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Permission check failed");
  if (!data) throw new Error("Forbidden: admin only");
}

async function isAdmin(context: AuthCtx): Promise<boolean> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

// Note: audit-log writes now happen inside the admin-actions Edge Function
// alongside each privileged mutation, so a separate helper is no longer needed.

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
  .handler(async ({ data }) => {
    return await callAdmin<{ path: string; mime: string }>("upload_crop_photo", {
      data_url: data.data_url,
      filename: data.filename,
    });
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

    const signed = await callAdmin<{ signedUrl: string | null }>("sign_crop_photo", {
      path: data.photo_path,
      ttl: 60 * 10,
    });
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
    // Sign photo URLs for display via the admin-actions edge function
    const paths = (data ?? []).map((d) => d.photo_path);
    const urls = paths.length
      ? await callAdmin<Record<string, string | null>>("sign_crop_photos", {
          paths,
          ttl: 60 * 30,
        })
      : {};
    return (data ?? []).map((d) => ({ ...d, photo_url: urls[d.photo_path] ?? null }));
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
    // Admin-role users cannot sell as farmers.
    if (await isAdmin(context)) {
      throw new Error("Admin accounts cannot sell on the marketplace. Use Marketplace management in the Web Admin instead.");
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
    if (await isAdmin(context)) {
      throw new Error("Admin accounts cannot buy on the marketplace. Only farmers can purchase products.");
    }
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
    const remainingStock = Math.max(0, (product.stock ?? 0) - data.qty);
    await callAdmin("product_decrement_stock", {
      product_id: product.id,
      remaining: remainingStock,
    });

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

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await callAdmin("admin_overview");
  });

// ---------- Admin: impersonation / farmer detail ----------

export const getFarmerDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return await callAdmin("farmer_detail", { user_id: data.user_id });
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
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        amount_cents: z
          .number()
          .int("Amount must be whole cents")
          .positive("Amount must be greater than zero")
          .max(50_000_000, "Top-up capped at ₦500,000 per transaction"),
        reason: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return await callAdmin("wallet_top_up", {
      user_id: data.user_id,
      amount_cents: data.amount_cents,
      reason: data.reason ?? null,
    });
  });

export const adminDeleteFarmer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Admins cannot delete their own account");
    return await callAdmin("farmer_delete", { user_id: data.user_id });
  });

export const adminDeleteGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return await callAdmin("garden_delete", { id: data.id });
  });

export const adminUpdateGarden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        size_sqm: z.number().nonnegative().nullable().optional(),
        location: z.string().nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return await callAdmin("garden_update", data as unknown as Record<string, unknown>);
  });

export const getSellEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("garden_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "harvested");
    const harvests = count ?? 0;
    return {
      eligible: harvests > 0,
      harvest_count: harvests,
      message:
        harvests > 0
          ? null
          : "You can only sell ginger after logging a harvest. Go to My Garden, plant ginger, then tap Harvest — your listing form will unlock automatically.",
    };
  });

// ---------- Admin: audit log, roles, misc ----------

export const listAdminAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return await callAdmin("audit_list");
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { is_admin: !!data };
  });

export const hasAnyAdmin = createServerFn({ method: "GET" }).handler(async () => {
  return await callAdmin("hasAnyAdmin");
});

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return await callAdmin("claim_admin");
  });

// ---------- Farmer: harvest history + water reminders ----------

export const getHarvestHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: events }, { data: plots }, { data: gardens }] = await Promise.all([
      supabase
        .from("garden_events")
        .select("*")
        .eq("user_id", userId)
        .eq("kind", "harvested")
        .order("occurred_at", { ascending: false }),
      supabase.from("plots").select("id, crop, garden_id").eq("user_id", userId),
      supabase.from("gardens").select("id, name").eq("user_id", userId),
    ]);
    const plotById = new Map((plots ?? []).map((p) => [p.id, p]));
    const gardenById = new Map((gardens ?? []).map((g) => [g.id, g.name]));
    return (events ?? []).map((e) => {
      const pl = plotById.get(e.plot_id);
      return {
        id: e.id,
        occurred_at: e.occurred_at,
        note: e.note,
        crop: pl?.crop ?? "Ginger",
        garden: pl ? gardenById.get(pl.garden_id) ?? "Garden" : "Garden",
      };
    });
  });

export const getWaterReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: plots }, { data: events }, { data: gardens }] = await Promise.all([
      supabase.from("plots").select("*").eq("user_id", userId).eq("status", "growing"),
      supabase.from("garden_events").select("plot_id, occurred_at, kind").eq("user_id", userId).eq("kind", "watered"),
      supabase.from("gardens").select("id, name").eq("user_id", userId),
    ]);
    const lastByPlot = new Map<string, string>();
    for (const e of events ?? []) {
      const cur = lastByPlot.get(e.plot_id);
      if (!cur || new Date(e.occurred_at).getTime() > new Date(cur).getTime()) {
        lastByPlot.set(e.plot_id, e.occurred_at);
      }
    }
    const gardenById = new Map((gardens ?? []).map((g) => [g.id, g.name]));
    const now = Date.now();
    const THRESHOLD_MS = 2 * 24 * 3600 * 1000; // 2 days
    return (plots ?? [])
      .map((p) => {
        const last = lastByPlot.get(p.id) ?? p.planted_on;
        const overdueMs = now - new Date(last).getTime();
        const days = Math.floor(overdueMs / 86400000);
        return {
          plot_id: p.id,
          crop: p.crop,
          garden: gardenById.get(p.garden_id) ?? "Garden",
          last_watered_at: lastByPlot.get(p.id) ?? null,
          days_since: days,
          due: overdueMs >= THRESHOLD_MS,
        };
      })
      .sort((a, b) => b.days_since - a.days_since);
  });

// ---------- Mobile access gate (block admins from the farmer app) ----------

export const getMobileAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isAdmin(context);
    return { is_admin: admin, allowed: !admin };
  });

// ---------- Admin: marketplace CRUD ----------

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: products }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, full_name"),
    ]);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Farmer"]));
    return (products ?? []).map((p) => ({
      ...p,
      seller_name: p.seller_id ? byId.get(p.seller_id) ?? "Farmer" : "Platform (Admin)",
    }));
  });

export const adminCreateListing = createServerFn({ method: "POST" })
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
    await assertAdmin(context);
    const hay = `${data.title} ${data.category} ${data.description}`.toLowerCase();
    if (!hay.includes("ginger")) {
      throw new Error("Marketplace only accepts ginger and ginger-related products.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .insert({
        seller_id: null,
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
    await logAdmin(context.userId, "product.create", "product", row.id, { title: row.title });
    return row;
  });

export const adminUpdateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        price_cents: z.number().int().nonnegative().optional(),
        stock: z.number().int().nonnegative().optional(),
        description: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await logAdmin(context.userId, "product.update", "product", id, patch);
    return { ok: true };
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAdmin(context.userId, "product.delete", "product", data.id, null);
    return { ok: true };
  });

// ---------- Admin: admin-user CRUD ----------

export const adminListAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, created_at").eq("role", "admin");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const sorted = [...(roles ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const firstAdminId = sorted[0]?.user_id ?? null;
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || "Admin"]));
    // Get emails via auth admin API
    const rows = await Promise.all(
      (roles ?? []).map(async (r) => {
        let email: string | null = null;
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
          email = data.user?.email ?? null;
        } catch {}
        return {
          user_id: r.user_id,
          full_name: nameById.get(r.user_id) ?? "Admin",
          email,
          created_at: r.created_at,
          is_self: r.user_id === context.userId,
          is_first: r.user_id === firstAdminId,
        };
      }),
    );
    return rows;
  });

export const adminCreateAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(6), full_name: z.string().optional().default("Admin") }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    // Ensure profile exists (trigger may or may not have fired)
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, full_name: data.full_name, onboarded: true }, { onConflict: "id" });
    const { error: re } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (re) throw new Error(re.message);
    await logAdmin(context.userId, "admin.create", "user", uid, { email: data.email });
    return { ok: true, user_id: uid };
  });

export const adminDeleteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Protect the first admin ever created — the root account cannot be removed.
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1);
    const firstAdminId = roles?.[0]?.user_id ?? null;
    if (firstAdminId && data.user_id === firstAdminId) {
      throw new Error("The first admin account cannot be deleted.");
    }
    try {
      await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    } catch (e) {
      console.error("auth.admin.deleteUser failed", e);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);
    }
    await logAdmin(context.userId, "admin.delete", "user", data.user_id, null);
    return { ok: true };
  });