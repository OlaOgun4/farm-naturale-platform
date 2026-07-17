import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
            "You are an expert plant pathologist for smallholder farmers. Analyze the plant photo and reply with STRICT JSON only, matching: {\"disease\":string,\"confidence\":number(0-1),\"severity\":\"mild\"|\"moderate\"|\"severe\"|\"none\",\"treatment\":string,\"prevention\":string,\"summary\":string}. If the plant looks healthy, use disease:\"Healthy\" and severity:\"none\". Keep treatment and prevention practical and organic-first. Do not wrap in code fences.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Crop context: ${data.crop || "unspecified"}. Diagnose the visible issue and give organic-first treatment and prevention advice for a smallholder farmer in India.`,
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
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
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

    const total = product.price_cents * data.qty;

    // Check wallet
    const { data: txs } = await supabase.from("wallet_transactions").select("kind, amount_cents").eq("user_id", userId);
    const balance = (txs ?? []).reduce((s, t) => (t.kind === "credit" ? s + t.amount_cents : s - t.amount_cents), 0);
    if (balance < total) throw new Error(`Insufficient wallet balance. Need ₹${(total / 100).toFixed(0)}, have ₹${(balance / 100).toFixed(0)}.`);

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

    return order;
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
                  "You are Priya, a friendly Farm Naturale agronomist. Answer smallholder farmer questions in 3-5 concise sentences, practical and organic-first. Use Indian context.",
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