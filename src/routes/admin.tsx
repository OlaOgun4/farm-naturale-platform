import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { getAdminOverview } from "@/lib/farm.functions";

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
  | "learning";

const NAV: { id: WebScreen; label: string }[] = [
  { id: "dashboard", label: "Executive Dashboard" },
  { id: "farmers", label: "Farmers" },
  { id: "gardens", label: "Home Gardens" },
  { id: "consult", label: "Consultations" },
  { id: "diagnostics", label: "Crop Diagnostics" },
  { id: "market", label: "Marketplace" },
  { id: "finance", label: "Finance" },
  { id: "learning", label: "Learning" },
];

function rupees(cents: number) {
  const rupees = Math.round(cents / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function AdminView() {
  const [active, setActive] = useState<WebScreen>("dashboard");
  const { data } = useSuspenseQuery(overviewQueryOptions);
  const current = NAV.find((n) => n.id === active)!;

  return (
    <div className="min-h-screen bg-[color:var(--fn-bg)] text-[color:var(--fn-text)]">
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
          <Link
            to="/"
            className="rounded-full border border-[color:var(--fn-line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--fn-navy)] hover:bg-[color:var(--fn-light)]"
          >
            Mobile App
          </Link>
          <span className="rounded-full bg-[color:var(--fn-green)] px-3 py-1.5 text-xs font-semibold text-white">
            Web Admin
          </span>
        </nav>
      </header>

      <main className="mx-auto flex max-w-[1200px] gap-5 p-5 lg:flex-row flex-col">
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

          <WebPanel screen={active} data={data} />
        </section>
      </main>
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

function WebPanel({ screen, data }: { screen: WebScreen; data: OverviewData }) {
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
          <Row
            key={g.id}
            left={
              <>
                <span className="font-semibold">{g.owner}</span>
                <span className="text-[color:var(--fn-muted)]"> • {g.name} • {g.location}</span>
              </>
            }
            right={g.crops.length ? g.crops.join(", ") : "no crops yet"}
            status={g.growing > 0 ? `${g.growing} growing` : undefined}
          />
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
              status={d.severity !== "none" ? d.severity : undefined}
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

  // learning
  return (
    <Panel title="Learning modules & certificates" empty={data.learning.length === 0}>
      {data.learning.map((m) => (
        <Row key={m.id} left={m.title} right={`${m.issued} certificate${m.issued === 1 ? "" : "s"} issued`} />
      ))}
    </Panel>
  );
}