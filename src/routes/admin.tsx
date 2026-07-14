import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

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
        content:
          "Platform operations and performance for the Farm Naturale network.",
      },
    ],
  }),
  component: AdminView,
});

type WebScreen =
  | "dashboard"
  | "gardens"
  | "consult"
  | "diagnostics"
  | "community"
  | "learning"
  | "market"
  | "inventory"
  | "farmers"
  | "finance"
  | "certificates"
  | "reports";

const NAV: { id: WebScreen; label: string }[] = [
  { id: "dashboard", label: "Executive Dashboard" },
  { id: "gardens", label: "Home Gardens" },
  { id: "consult", label: "Consultations" },
  { id: "diagnostics", label: "Crop Diagnostics" },
  { id: "community", label: "Community" },
  { id: "learning", label: "Learning" },
  { id: "market", label: "Marketplace" },
  { id: "inventory", label: "Inventory" },
  { id: "farmers", label: "Farmers" },
  { id: "finance", label: "Finance" },
  { id: "certificates", label: "Certifications" },
  { id: "reports", label: "Analytics" },
];

function AdminView() {
  const [active, setActive] = useState<WebScreen>("dashboard");
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
                Platform operations and performance
              </p>
            </div>
            <span className="text-sm text-[color:var(--fn-muted)]">
              Admin User • All Regions • July 2026
            </span>
          </div>

          <WebPanel screen={active} />
        </section>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--fn-line)] bg-white p-4">
      <span className="block text-xs text-[color:var(--fn-muted)]">{label}</span>
      <b className="mt-1.5 block text-2xl text-[color:var(--fn-green)]">
        {value}
      </b>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--fn-line)] bg-white p-4">
      <h3 className="mb-2 text-base font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  left,
  right,
  status,
}: {
  left: string;
  right?: string;
  status?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-[#edf2ee] py-2.5 text-sm last:border-b-0">
      <span>{left}</span>
      <span className="flex items-center gap-2">
        {right && <span>{right}</span>}
        {status && (
          <span className="rounded-full bg-[#e8f7ed] px-2 py-1 text-[11px] font-bold text-[color:var(--fn-green)]">
            {status}
          </span>
        )}
      </span>
    </div>
  );
}

function WebPanel({ screen }: { screen: WebScreen }) {
  if (screen === "dashboard") {
    return (
      <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Active farmers" value="3,842" />
          <Kpi label="Home gardens" value="1,206" />
          <Kpi label="Consultations this month" value="284" />
          <Kpi label="Marketplace GMV" value="₦58.4M" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Panel title="Advisory volume (last 7 days)">
            <div className="flex h-40 items-end gap-2 rounded-xl bg-gradient-to-b from-[#eef8f0] to-white p-4">
              {[42, 55, 38, 68, 74, 61, 82].map((h, i) => (
                <div
                  key={i}
                  className="w-6 rounded-t-md bg-[color:var(--fn-green)]"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </Panel>
          <Panel title="Regional performance">
            <Row left="North West" right="1,240 farmers" status="On track" />
            <Row left="South West" right="932 farmers" status="On track" />
            <Row left="North Central" right="710 farmers" status="Watch" />
            <Row left="South East" right="486 farmers" status="On track" />
          </Panel>
        </div>
      </>
    );
  }

  if (screen === "gardens") {
    return (
      <Panel title="Active home gardens">
        <Row left="Amina Musa • Kaduna" right="4 crops" status="Healthy" />
        <Row left="Chika Okoro • Enugu" right="3 crops" status="Healthy" />
        <Row left="Kemi Ade • Lagos" right="5 crops" status="Attention" />
      </Panel>
    );
  }

  if (screen === "consult") {
    return (
      <Panel title="Upcoming consultations">
        <Row left="Dr. Adebayo • Crop Health" right="15 Jul, 10:00" status="Confirmed" />
        <Row left="Mrs. Okeke • Home Gardening" right="16 Jul, 14:00" status="Confirmed" />
        <Row left="Dr. Adebayo • Commercial" right="18 Jul, 11:00" status="Pending" />
      </Panel>
    );
  }

  if (screen === "diagnostics") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Top detected issues">
          <Row left="Nitrogen deficiency" right="184 cases" />
          <Row left="Aphid infestation" right="122 cases" />
          <Row left="Fungal leaf spot" right="93 cases" />
        </Panel>
        <Panel title="Escalations to agronomist">
          <Row left="Awaiting expert" right="14" status="Priority" />
          <Row left="Resolved this week" right="47" status="Closed" />
        </Panel>
      </div>
    );
  }

  if (screen === "community") {
    return (
      <Panel title="Trending discussions">
        <Row left="Best natural treatment for aphids" right="24 replies" />
        <Row left="Ginger yield in small plots" right="18 replies" />
        <Row left="Composting kitchen waste" right="12 replies" />
      </Panel>
    );
  }

  if (screen === "learning") {
    return (
      <Panel title="Course engagement">
        <Row left="Home Gardening Essentials" right="1,204 learners" status="Live" />
        <Row left="Ginger Production" right="612 learners" status="Live" />
        <Row left="Commercial Farming 101" right="341 learners" status="Draft" />
      </Panel>
    );
  }

  if (screen === "market") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Top products">
          <Row left="Home Garden Starter Pack" right="₦22,500 • 412 sold" />
          <Row left="Organic Compost" right="₦12,000 • 386 sold" />
          <Row left="Vegetable Seed Kit" right="₦4,800 • 271 sold" />
        </Panel>
        <Panel title="Buy-back queue">
          <Row left="Fresh ginger • 500 kg" right="₦600,000" status="Pending" />
          <Row left="Tomato • 220 kg" right="₦132,000" status="Approved" />
        </Panel>
      </div>
    );
  }

  if (screen === "inventory") {
    return (
      <Panel title="Stock levels">
        <Row left="Organic compost" right="820 bags" status="Healthy" />
        <Row left="Vegetable seeds" right="42 packs" status="Low" />
        <Row left="Nursery bags" right="1,240 units" status="Healthy" />
      </Panel>
    );
  }

  if (screen === "farmers") {
    return (
      <Panel title="Recently onboarded">
        <Row left="Amina Musa • Kaduna" right="1.2 ha" status="Verified" />
        <Row left="Chika Okoro • Enugu" right="0.8 ha" status="Verified" />
        <Row left="Kemi Ade • Lagos" right="0.3 ha" status="Pending" />
      </Panel>
    );
  }

  if (screen === "finance") {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Wallet balance total" value="₦92.4M" />
        <Kpi label="Payouts this month" value="₦17.1M" />
        <Kpi label="Buy-back spend" value="₦12.8M" />
      </div>
    );
  }

  if (screen === "certificates") {
    return (
      <Panel title="Issued credentials">
        <Row left="Home Gardening Essentials" right="612 issued" />
        <Row left="Ginger Production" right="184 issued" />
        <Row left="Commercial Farming 101" right="58 issued" />
      </Panel>
    );
  }

  // reports
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Farmer growth (YoY)">
        <div className="flex h-40 items-end gap-2 rounded-xl bg-gradient-to-b from-[#eef8f0] to-white p-4">
          {[30, 42, 51, 58, 66, 74, 82, 88].map((h, i) => (
            <div
              key={i}
              className="w-5 rounded-t-md bg-[color:var(--fn-green)]"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </Panel>
      <Panel title="Revenue mix">
        <Row left="Marketplace" right="52%" />
        <Row left="Consulting" right="21%" />
        <Row left="Learning" right="14%" />
        <Row left="Buy-back services" right="13%" />
      </Panel>
    </div>
  );
}