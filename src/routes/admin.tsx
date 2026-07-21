import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getAdminOverview,
  getFarmerDetail,
  adminDeleteFarmer,
  adminDeleteGarden,
  adminTopUpWallet,
  listAdminAudit,
} from "@/lib/farm.functions";
import { X, Eye, Trash2, Wallet } from "lucide-react";
import { toast, Toaster } from "sonner";

const overviewQueryOptions = queryOptions({
  queryKey: ["admin-overview"],
  queryFn: () => getAdminOverview(),
});

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Farm Naturale — Web Admin" },
      {
        name: "description",
        content:
          "Operations dashboard for Farm Naturale: farmers, home gardens, consultations, marketplace, inventory, finance and analytics.",
      },
      { property: "og:title", content: "Farm Naturale — Web Admin" },
      {
        property: "og:description",
        content: "Platform operations and performance for the Farm Naturale network.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQueryOptions),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-red-700">Failed to load admin data: {String(error?.message ?? error)}</div>
  ),
  notFoundComponent: () => <div className="p-8">Not found.</div>,
  component: AdminView,
});

type WebScreen =
  | "dashboard"
  | "farmers"
  | "gardens"
  | "consult"
  | "diagnostics"
  | "market"
  | "finance"
  | "learning"
  | "audit";

const NAV: { id: WebScreen; label: string }[] = [
  { id: "dashboard", label: "Executive Dashboard" },
  { id: "farmers", label: "Farmers" },
  { id: "gardens", label: "Home Gardens" },
  { id: "consult", label: "Consultations" },
  { id: "diagnostics", label: "Crop Diagnostics" },
  { id: "market", label: "Marketplace" },
  { id: "finance", label: "Finance" },
  { id: "learning", label: "Learning" },
  { id: "audit", label: "Audit Log" },
];

function rupees(cents: number) {
  const naira = Math.round(cents / 100);
  return "₦" + naira.toLocaleString("en-NG");
}

function AdminView() {
  const [active, setActive] = useState<WebScreen>("dashboard");
  const { data } = useSuspenseQuery(overviewQueryOptions);
  const current = NAV.find((n) => n.id === active)!;
  const [impersonateId, setImpersonateId] = useState<string | null>(null);
  const [topUpId, setTopUpId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[color:var(--fn-bg)] text-[color:var(--fn-text)]">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[color:var(--fn-line)] bg-white px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid h-[50px] w-[50px] place-items-center rounded-2xl bg-gradient-to-br from-[color:var(--fn-green)] to-[color:var(--fn-green-3)] font-black text-white">
            FN
          </div>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-2xl font-bold text-[color:var(--fn-green-2)]">
              Farm Naturale
            </h1>
            <p className="m-0 mt-0.5 text-sm text-[color:var(--fn-muted)]">
              Grow • Learn • Prosper
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <span className="rounded-full bg-[color:var(--fn-green)] px-3 py-1.5 text-xs font-semibold text-white">
            Web Admin
          </span>
        </nav>
      </header>

      <main className="mx-auto flex w-full gap-5 p-5 lg:flex-row flex-col">
        <aside className="w-full shrink-0 self-start rounded-2xl bg-[color:var(--fn-navy)] p-4 text-white shadow-[0_12px_30px_rgba(22,60,35,0.08)] lg:sticky lg:top-[92px] lg:w-[235px]">
          <h2 className="mb-3 text-lg font-bold">Farm Naturale</h2>
          <div className="grid gap-1.5">
            {NAV.map((n) => {
              const on = n.id === active;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={
                    "rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors " +
                    (on
                      ? "border-transparent bg-[color:var(--fn-green)] text-white"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10")
                  }
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-2xl border border-[color:var(--fn-line)] bg-white p-5 shadow-[0_12px_30px_rgba(22,60,35,0.08)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--fn-line)] pb-3.5">
            <div>
              <strong className="text-xl">{current.label}</strong>
              <p className="mt-1 text-sm text-[color:var(--fn-muted)]">
                Live data from the Farm Naturale mobile app
              </p>
            </div>
            <span className="text-sm text-[color:var(--fn-muted)]">
              Admin • {data.kpis.farmers} farmers on platform
            </span>
          </div>

          <WebPanel screen={active} data={data} onImpersonate={setImpersonateId} onTopUp={setTopUpId} />
        </section>
      </main>
      {impersonateId ? (
        <ImpersonateModal userId={impersonateId} onClose={() => setImpersonateId(null)} />
      ) : null}
      {topUpId ? (
        <TopUpModal
          userId={topUpId}
          farmerName={data.farmers.find((f) => f.id === topUpId)?.full_name ?? "Farmer"}
          onClose={() => setTopUpId(null)}
        />
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--fn-line)] bg-white p-4">
      <span className="block text-xs text-[color:var(--fn-muted)]">{label}</span>
      <b className="mt-1.5 block text-2xl text-[color:var(--fn-green)]">{value}</b>
    </div>
  );
}

function Panel({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="rounded-2xl border border-[color:var(--fn-line)] bg-white p-4">
      <h3 className="mb-2 text-base font-bold">{title}</h3>
      {empty ? <p className="py-4 text-center text-sm text-[color:var(--fn-muted)]">No data yet — try the mobile app.</p> : children}
    </div>
  );
}

function Row({ left, right, status }: { left: React.ReactNode; right?: React.ReactNode; status?: string }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-[#edf2ee] py-2.5 text-sm last:border-b-0">
      <span className="min-w-0 flex-1 truncate">{left}</span>
      <span className="flex items-center gap-2">
        {right !== undefined && <span className="text-[color:var(--fn-muted)]">{right}</span>}
        {status && (
          <span className="rounded-full bg-[#e8f7ed] px-2 py-1 text-[11px] font-bold text-[color:var(--fn-green)]">
            {status}
          </span>
        )}
      </span>
    </div>
  );
}

type OverviewData = Awaited<ReturnType<typeof getAdminOverview>>;

function WebPanel({
  screen,
  data,
  onImpersonate,
  onTopUp,
}: {
  screen: WebScreen;
  data: OverviewData;
  onImpersonate: (userId: string) => void;
  onTopUp: (userId: string) => void;
}) {
  if (screen === "dashboard") {
    const maxSignups = Math.max(1, ...data.signups7d.map((d) => d.count));
    return (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Registered farmers" value={String(data.kpis.farmers)} />
          <Kpi label="Home gardens" value={String(data.kpis.gardens)} />
          <Kpi label="Crops growing" value={String(data.kpis.plots_growing)} />
          <Kpi label="Marketplace GMV" value={rupees(data.kpis.gmv_cents)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="AI diagnoses" value={String(data.kpis.diagnoses)} />
          <Kpi label="Orders placed" value={String(data.kpis.orders)} />
          <Kpi label="Certificates issued" value={String(data.kpis.certificates)} />
          <Kpi label="Open consultations" value={String(data.kpis.consulting_open)} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Panel title="New signups (last 7 days)">
            <div className="flex h-40 items-end gap-2 rounded-xl bg-gradient-to-b from-[#eef8f0] to-white p-4">
              {data.signups7d.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-md bg-[color:var(--fn-green)]"
                    style={{ height: `${(d.count / maxSignups) * 100}%`, minHeight: d.count > 0 ? 6 : 2 }}
                    title={`${d.count} signups`}
                  />
                  <span className="text-[10px] text-[color:var(--fn-muted)]">{d.day}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Regions / villages" empty={data.regions.length === 0}>
            {data.regions.map((r) => (
              <Row key={r.village} left={r.village} right={`${r.count} farmer${r.count === 1 ? "" : "s"}`} />
            ))}
          </Panel>
        </div>
      </>
    );
  }

  if (screen === "farmers") {
    return (
      <Panel title="All farmers on the platform" empty={data.farmers.length === 0}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[color:var(--fn-muted)]">
              <tr>
                <th className="py-2">Name</th>
                <th>Village</th>
                <th>Land</th>
                <th>Gardens</th>
                <th>Growing</th>
                <th>Wallet</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.farmers.map((f) => (
                <tr key={f.id} className="border-t border-[#edf2ee]">
                  <td className="py-2 font-semibold">{f.full_name}</td>
                  <td>{f.village}</td>
                  <td>{f.land_size_acres ? `${f.land_size_acres} ac` : "—"}</td>
                  <td>{f.gardens}</td>
                  <td>{f.growing}/{f.plots}</td>
                  <td>{rupees(f.wallet_cents)}</td>
                  <td>
                    <span className={"rounded-full px-2 py-1 text-[11px] font-bold " + (f.onboarded ? "bg-[#e8f7ed] text-[color:var(--fn-green)]" : "bg-amber-100 text-amber-700")}>
                      {f.onboarded ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => onImpersonate(f.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--fn-green)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--fn-green)] hover:bg-[#e8f7ed]"
                    >
                      <Eye className="h-3 w-3" /> View as
                    </button>
                    <button
                      onClick={() => onTopUp(f.id)}
                      className="ml-1 inline-flex items-center gap-1 rounded-full border border-[color:var(--fn-navy)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--fn-navy)] hover:bg-slate-100"
                    >
                      <Wallet className="h-3 w-3" /> Top up
                    </button>
                    <DeleteFarmerButton userId={f.id} name={f.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  }

  if (screen === "gardens") {
    return (
      <Panel title="Home gardens" empty={data.gardensList.length === 0}>
        {data.gardensList.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-2 border-b border-[#edf2ee] py-2.5 text-sm last:border-b-0">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold">{g.owner}</span>
              <span className="text-[color:var(--fn-muted)]"> • {g.name} • {g.location}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[color:var(--fn-muted)]">{g.crops.length ? g.crops.join(", ") : "no crops yet"}</span>
              {g.growing > 0 && (
                <span className="rounded-full bg-[#e8f7ed] px-2 py-1 text-[11px] font-bold text-[color:var(--fn-green)]">{g.growing} growing</span>
              )}
              <DeleteGardenButton gardenId={g.id} name={g.name} />
            </span>
          </div>
        ))}
      </Panel>
    );
  }

  if (screen === "consult") {
    return (
      <Panel title="Consultation requests" empty={data.consultingQueue.length === 0}>
        {data.consultingQueue.map((c) => (
          <div key={c.id} className="border-b border-[#edf2ee] py-3 last:border-b-0">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{c.farmer} <span className="text-[color:var(--fn-muted)]">• {c.crop}</span></span>
              <span className={"rounded-full px-2 py-1 text-[11px] font-bold " + (c.replied ? "bg-[#e8f7ed] text-[color:var(--fn-green)]" : "bg-amber-100 text-amber-700")}>
                {c.replied ? "Replied" : "Awaiting"}
              </span>
            </div>
            <p className="mt-1 text-sm">{c.question}</p>
            {c.reply && <p className="mt-1 text-xs text-[color:var(--fn-muted)]">→ {c.reply}</p>}
          </div>
        ))}
      </Panel>
    );
  }

  if (screen === "diagnostics") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Top detected issues" empty={data.topDiseases.length === 0}>
          {data.topDiseases.map((d) => (
            <Row key={d.disease} left={d.disease} right={`${d.count} case${d.count === 1 ? "" : "s"}`} />
          ))}
        </Panel>
        <Panel title="Recent diagnoses" empty={data.recentDiagnoses.length === 0}>
          {data.recentDiagnoses.map((d) => (
            <Row
              key={d.id}
              left={
                <>
                  <span className="font-semibold">{d.farmer}</span>
                  <span className="text-[color:var(--fn-muted)]"> • {d.crop}</span>
                </>
              }
              right={d.disease}
              status={d.severity && d.severity !== "none" ? d.severity : undefined}
            />
          ))}
        </Panel>
      </div>
    );
  }

  if (screen === "market") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Top products" empty={data.topProducts.length === 0}>
          {data.topProducts.map((p) => (
            <Row
              key={p.id}
              left={<><span className="font-semibold">{p.title}</span> <span className="text-[color:var(--fn-muted)]">• {p.category}</span></>}
              right={`${rupees(p.price_cents)} • ${p.sold} sold`}
            />
          ))}
        </Panel>
        <Panel title="Recent orders" empty={data.recentOrders.length === 0}>
          {data.recentOrders.map((o) => (
            <Row
              key={o.id}
              left={
                <>
                  <span className="font-semibold">{o.farmer}</span>
                  <span className="text-[color:var(--fn-muted)]"> • {o.items.map((i) => `${i.title} ×${i.qty}`).join(", ") || "—"}</span>
                </>
              }
              right={rupees(o.total_cents)}
              status={o.status}
            />
          ))}
        </Panel>
      </div>
    );
  }

  if (screen === "finance") {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-3">
          <Kpi label="Wallet balance total" value={rupees(data.kpis.wallet_total_cents)} />
          <Kpi label="Payouts requested" value={rupees(data.kpis.payouts_cents)} />
          <Kpi label="Marketplace GMV" value={rupees(data.kpis.gmv_cents)} />
        </div>
        <div className="mt-4">
          <Panel title="Top wallet balances" empty={data.farmers.length === 0}>
            {[...data.farmers]
              .sort((a, b) => b.wallet_cents - a.wallet_cents)
              .slice(0, 8)
              .map((f) => (
                <Row key={f.id} left={<><span className="font-semibold">{f.full_name}</span> <span className="text-[color:var(--fn-muted)]"> • {f.village}</span></>} right={rupees(f.wallet_cents)} />
              ))}
          </Panel>
        </div>
      </>
    );
  }

  if (screen === "learning") {
    return (
      <Panel title="Learning modules & certificates" empty={data.learning.length === 0}>
        {data.learning.map((m) => (
          <Row key={m.id} left={m.title} right={`${m.issued} certificate${m.issued === 1 ? "" : "s"} issued`} />
        ))}
      </Panel>
    );
  }

  return <AuditPanel />;
}

function AuditPanel() {
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: useServerFn(listAdminAudit) });
  const rows = audit.data ?? [];
  return (
    <Panel title="Administrative audit trail" empty={rows.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-[color:var(--fn-muted)]">
            <tr>
              <th className="py-2">When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[color:var(--fn-line)]">
                <td className="py-2 text-xs text-[color:var(--fn-muted)]">{new Date(r.created_at).toLocaleString()}</td>
                <td className="text-xs">{r.admin_name ?? r.admin_id.slice(0, 8)}</td>
                <td className="text-xs font-semibold">{r.action}</td>
                <td className="text-xs">{r.target_name ?? (r.target_id ? r.target_id.slice(0, 8) : "—")}</td>
                <td className="text-xs text-[color:var(--fn-muted)]">{r.details ? JSON.stringify(r.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function fmt(cents: number) {
  return "₦" + Math.round(cents / 100).toLocaleString("en-NG");
}

function ImpersonateModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["farmer-detail", userId],
    queryFn: () => getFarmerDetail({ data: { user_id: userId } }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading || !data ? (
          <div className="p-8 text-center text-sm text-[color:var(--fn-muted)]">Loading farmer view…</div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">Failed to load: {String((error as Error).message)}</div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="rounded-2xl bg-gradient-to-br from-[color:var(--fn-green)] to-[color:var(--fn-green-3)] p-4 text-white">
              <p className="text-[11px] font-bold uppercase opacity-80">Impersonating (read-only)</p>
              <h2 className="mt-1 text-xl font-bold">Namaste, {data.profile?.full_name || "Farmer"} 👋</h2>
              <p className="text-xs opacity-90">{data.profile?.village || "—"} • {data.profile?.land_size_acres ?? 0} acres</p>
              <div className="mt-3 rounded-xl bg-white/15 p-3">
                <p className="text-[10px] uppercase opacity-80">Wallet balance</p>
                <p className="text-2xl font-black">{fmt(data.wallet_cents)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[color:var(--fn-light)] p-2">
                <p className="text-lg font-bold text-[color:var(--fn-green)]">{data.gardens.length}</p>
                <p className="text-[10px] text-[color:var(--fn-muted)]">Gardens</p>
              </div>
              <div className="rounded-xl bg-[color:var(--fn-light)] p-2">
                <p className="text-lg font-bold text-[color:var(--fn-green)]">{data.plots.filter((p) => p.status === "growing").length}/{data.plots.length}</p>
                <p className="text-[10px] text-[color:var(--fn-muted)]">Growing</p>
              </div>
              <div className="rounded-xl bg-[color:var(--fn-light)] p-2">
                <p className="text-lg font-bold text-[color:var(--fn-green)]">{data.diagnoses.length}</p>
                <p className="text-[10px] text-[color:var(--fn-muted)]">Diagnoses</p>
              </div>
            </div>

            <Section title="Home Gardens">
              {data.gardens.length === 0 ? <Empty text="No gardens yet" /> : data.gardens.map((g) => {
                const gPlots = data.plots.filter((p) => p.garden_id === g.id);
                return (
                  <div key={g.id} className="rounded-xl border border-[color:var(--fn-line)] p-3">
                    <p className="font-bold text-sm">{g.name}</p>
                    <p className="text-xs text-[color:var(--fn-muted)]">{g.location || "—"} • {g.size_sqm ?? 0} sqm</p>
                    <p className="mt-1 text-xs">{gPlots.length ? gPlots.map((p) => `${p.crop} (${p.status})`).join(", ") : "No plots"}</p>
                  </div>
                );
              })}
            </Section>

            <Section title="AI Crop Doctor · Recent">
              {data.diagnoses.length === 0 ? <Empty text="No diagnoses yet" /> : data.diagnoses.slice(0, 5).map((d) => (
                <div key={d.id} className="flex gap-3 rounded-xl border border-[color:var(--fn-line)] p-2.5">
                  {d.photo_url ? <img src={d.photo_url} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg bg-[color:var(--fn-light)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{d.disease}</p>
                    <p className="text-[11px] text-[color:var(--fn-muted)]">{d.crop || "Ginger"} • {d.severity || "—"}</p>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Wallet · Recent Activity">
              {data.transactions.length === 0 ? <Empty text="No transactions" /> : data.transactions.slice(0, 8).map((t, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[#edf2ee] py-2 text-xs last:border-b-0">
                  <span>{t.reason || t.kind}</span>
                  <span className={t.kind === "credit" ? "font-bold text-[color:var(--fn-green)]" : "font-bold text-red-600"}>
                    {t.kind === "credit" ? "+" : "-"}{fmt(t.amount_cents)}
                  </span>
                </div>
              ))}
            </Section>

            <Section title="Orders">
              {data.orders.length === 0 ? <Empty text="No orders yet" /> : data.orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl border border-[color:var(--fn-line)] p-2.5 text-xs">
                  <span className="min-w-0 flex-1 truncate">{o.items.map((i) => `${i.title}×${i.qty}`).join(", ") || "—"}</span>
                  <span className="font-bold">{fmt(o.total_cents)}</span>
                </div>
              ))}
            </Section>

            <Section title="Consultations">
              {data.consulting.length === 0 ? <Empty text="No consultations" /> : data.consulting.slice(0, 5).map((c) => (
                <div key={c.id} className="rounded-xl border border-[color:var(--fn-line)] p-2.5 text-xs">
                  <p className="font-bold">{c.question}</p>
                  {c.reply && <p className="mt-1 text-[color:var(--fn-muted)]">→ {c.reply}</p>}
                </div>
              ))}
            </Section>

            <Section title="Certificates">
              {data.certificates.length === 0 ? <Empty text="No certificates yet" /> : data.certificates.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-[color:var(--fn-line)] p-2.5 text-xs">
                  <span className="font-bold">{c.module_title}</span>
                  <span className="text-[color:var(--fn-muted)]">{c.code}</span>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[color:var(--fn-muted)]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-[color:var(--fn-light)] p-3 text-center text-xs text-[color:var(--fn-muted)]">{text}</p>;
}

function DeleteFarmerButton({ userId, name }: { userId: string; name: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteFarmer),
    onSuccess: () => {
      toast.success(`Deleted ${name}`);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <button
      disabled={del.isPending}
      onClick={() => {
        if (window.confirm(`Delete ${name} and ALL their data? This cannot be undone.`)) {
          del.mutate({ data: { user_id: userId } });
        }
      }}
      className="ml-1 inline-flex items-center gap-1 rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" /> Delete
    </button>
  );
}

function DeleteGardenButton({ gardenId, name }: { gardenId: string; name: string }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: useServerFn(adminDeleteGarden),
    onSuccess: () => {
      toast.success(`Deleted ${name}`);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <button
      disabled={del.isPending}
      onClick={() => {
        if (window.confirm(`Delete garden "${name}" and all its plots?`)) {
          del.mutate({ data: { id: gardenId } });
        }
      }}
      className="inline-flex items-center gap-1 rounded-full border border-red-300 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" /> Delete
    </button>
  );
}

function TopUpModal({ userId, farmerName, onClose }: { userId: string; farmerName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("5000");
  const [reason, setReason] = useState("Grant top-up");
  const topUp = useMutation({
    mutationFn: useServerFn(adminTopUpWallet),
    onSuccess: () => {
      toast.success(`Wallet topped up for ${farmerName}`);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["farmer-detail", userId] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">Top up wallet</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-[color:var(--fn-muted)]">Adding funds to {farmerName}&apos;s wallet.</p>
        <label className="block text-[11px] font-bold uppercase text-[color:var(--fn-muted)]">Amount (₦)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[color:var(--fn-line)] px-3 py-2 text-sm outline-none focus:border-[color:var(--fn-green)]"
        />
        <label className="mt-3 block text-[11px] font-bold uppercase text-[color:var(--fn-muted)]">Reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[color:var(--fn-line)] px-3 py-2 text-sm outline-none focus:border-[color:var(--fn-green)]"
        />
        <button
          disabled={topUp.isPending || !(Number(amount) > 0)}
          onClick={() =>
            topUp.mutate({
              data: { user_id: userId, amount_cents: Math.round(Number(amount) * 100), reason },
            })
          }
          className="mt-4 w-full rounded-xl bg-[color:var(--fn-green)] py-2 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {topUp.isPending ? "Processing…" : `Add ₦${Number(amount || 0).toLocaleString("en-NG")} to wallet`}
        </button>
      </div>
    </div>
  );
}