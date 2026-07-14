import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: MobilePrototype,
});

type ScreenId =
  | "login"
  | "dashboard"
  | "garden"
  | "calendar"
  | "weather"
  | "diagnosis"
  | "result"
  | "consult"
  | "confirm"
  | "community"
  | "learning"
  | "market"
  | "product"
  | "inventory"
  | "farm"
  | "harvest"
  | "sell"
  | "wallet"
  | "certificates";

const JOURNEY: { id: ScreenId; label: string }[] = [
  { id: "login", label: "1 Login" },
  { id: "dashboard", label: "2 Dashboard" },
  { id: "garden", label: "3 My Home Garden" },
  { id: "calendar", label: "4 Garden Calendar" },
  { id: "weather", label: "5 Weather" },
  { id: "diagnosis", label: "6 Crop Doctor" },
  { id: "result", label: "7 Diagnosis Result" },
  { id: "consult", label: "8 Book Consultation" },
  { id: "confirm", label: "9 Booking Confirmed" },
  { id: "community", label: "10 Community" },
  { id: "learning", label: "11 Learning" },
  { id: "market", label: "12 Marketplace" },
  { id: "product", label: "13 Product Detail" },
  { id: "inventory", label: "14 Inventory" },
  { id: "farm", label: "15 Register Farm" },
  { id: "harvest", label: "16 Harvest" },
  { id: "sell", label: "17 Sell Produce" },
  { id: "wallet", label: "18 Wallet" },
  { id: "certificates", label: "19 Certificates" },
];

function MobilePrototype() {
  const [screen, setScreen] = useState<ScreenId>("dashboard");
  const go = (s: ScreenId) => {
    setScreen(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[color:var(--fn-bg)] text-[color:var(--fn-text)]">
      <TopBar />

      <main className="mx-auto max-w-[520px] px-2.5 pt-2.5 pb-[130px]">
        <div className="overflow-hidden rounded-[22px] border border-[color:var(--fn-line)] bg-white shadow-[0_12px_30px_rgba(22,60,35,0.08)] min-h-[620px]">
          <div className="p-4">
            <Screen id={screen} go={go} />
          </div>
        </div>
      </main>

      <JourneyNav active={screen} onSelect={go} />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[color:var(--fn-line)] bg-white px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-[42px] w-[42px] place-items-center rounded-[13px] bg-[color:var(--fn-green)] font-extrabold text-white">
          FN
        </div>
        <div>
          <h1 className="m-0 text-xl font-bold text-[color:var(--fn-green)]">Farm Naturale</h1>
          <p className="m-0 mt-0.5 text-[11px] text-[color:var(--fn-muted)]">Grow • Learn • Prosper</p>
        </div>
      </div>
      <nav className="flex items-center gap-2">
        <Link
          to="/"
          className="rounded-full bg-[#e5f5ea] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--fn-green)]"
        >
          Mobile
        </Link>
        <Link
          to="/admin"
          className="rounded-full border border-[color:var(--fn-line)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--fn-navy)] hover:bg-[color:var(--fn-light)]"
        >
          Web Admin
        </Link>
      </nav>
    </header>
  );
}

function JourneyNav({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (s: ScreenId) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--fn-line)] bg-white/95 backdrop-blur"
      style={{
        paddingLeft: "max(10px, env(safe-area-inset-left))",
        paddingRight: "max(10px, env(safe-area-inset-right))",
        paddingBottom: "calc(9px + env(safe-area-inset-bottom))",
        paddingTop: 9,
      }}
    >
      <p className="mx-auto mb-1.5 max-w-[520px] text-[11px] font-extrabold text-[color:var(--fn-muted)]">
        User journey
      </p>
      <div className="mx-auto flex max-w-[520px] gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOURNEY.map((j) => {
          const on = j.id === active;
          return (
            <button
              key={j.id}
              onClick={() => onSelect(j.id)}
              className={
                "flex min-h-[38px] shrink-0 items-center whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold transition-colors " +
                (on
                  ? "bg-[color:var(--fn-green)] text-white"
                  : "bg-[#edf4ef] text-[color:var(--fn-text)] hover:bg-[#dcecdf]")
              }
            >
              {j.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ————————————————————————————————————————————
// Reusable primitives
// ————————————————————————————————————————————
function Card({
  children,
  variant,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "success" | "warning" | "certificate";
  className?: string;
}) {
  const bg =
    variant === "success"
      ? "bg-[#e8f7ed]"
      : variant === "warning"
        ? "bg-[#fff7df]"
        : "bg-white";
  const border =
    variant === "certificate"
      ? "border-l-4 border-l-[color:var(--fn-green)]"
      : "";
  return (
    <div
      className={`my-2.5 rounded-2xl border border-[color:var(--fn-line)] p-3.5 shadow-[0_4px_12px_rgba(20,50,30,0.04)] ${bg} ${border} ${className}`}
    >
      {children}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border-l-4 border-l-[color:var(--fn-green)] bg-[#eef7f0] p-3 text-[13px]">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-2.5 block text-[13px] font-bold">
      <span className="block">{label}</span>
      <span className="block">{children}</span>
    </label>
  );
}

const inputCls =
  "mt-1.5 w-full rounded-xl border border-[color:var(--fn-line)] bg-white p-3 text-base outline-none focus:border-[color:var(--fn-green)] focus:ring-2 focus:ring-[color:var(--fn-green)]/20";

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[color:var(--fn-green)] px-4 py-3 text-center font-bold text-white transition-colors hover:bg-[color:var(--fn-green-2)]"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#edf4ef] px-4 py-3 text-center font-bold text-[#183420] hover:bg-[#dcecdf]"
    >
      {children}
    </button>
  );
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-1 text-2xl font-bold">{children}</h2>;
}

function HeroImage({ emoji, alt }: { emoji: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="my-2.5 grid h-[180px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e7f6ec] to-[#dcecdf] text-6xl"
    >
      <span aria-hidden>{emoji}</span>
    </div>
  );
}

// ————————————————————————————————————————————
// Screens
// ————————————————————————————————————————————
function Screen({ id, go }: { id: ScreenId; go: (s: ScreenId) => void }) {
  switch (id) {
    case "login":
      return <LoginScreen go={go} />;
    case "dashboard":
      return <DashboardScreen go={go} />;
    case "garden":
      return <GardenScreen go={go} />;
    case "calendar":
      return <CalendarScreen />;
    case "weather":
      return <WeatherScreen />;
    case "diagnosis":
      return <DiagnosisScreen go={go} />;
    case "result":
      return <ResultScreen go={go} />;
    case "consult":
      return <ConsultScreen go={go} />;
    case "confirm":
      return <ConfirmScreen go={go} />;
    case "community":
      return <CommunityScreen />;
    case "learning":
      return <LearningScreen />;
    case "market":
      return <MarketScreen go={go} />;
    case "product":
      return <ProductScreen go={go} />;
    case "inventory":
      return <InventoryScreen go={go} />;
    case "farm":
      return <FarmScreen />;
    case "harvest":
      return <HarvestScreen go={go} />;
    case "sell":
      return <SellScreen />;
    case "wallet":
      return <WalletScreen />;
    case "certificates":
      return <CertificatesScreen />;
  }
}

function LoginScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <HeroImage emoji="🌱" alt="Farm Naturale welcome" />
      <h2 className="mt-1 text-2xl font-bold">Welcome to Farm Naturale</h2>
      <p className="text-[color:var(--fn-muted)]">
        Sign in to manage your farm and home garden.
      </p>
      <Field label="Phone number">
        <input className={inputCls} defaultValue="0803 123 4567" />
      </Field>
      <Field label="Password">
        <input className={inputCls} type="password" defaultValue="password" />
      </Field>
      <PrimaryButton onClick={() => go("dashboard")}>Login</PrimaryButton>
    </>
  );
}

function DashboardScreen({ go }: { go: (s: ScreenId) => void }) {
  const actions: { icon: string; label: string; to: ScreenId }[] = [
    { icon: "🏡", label: "Home Garden", to: "garden" },
    { icon: "🤖", label: "Crop Doctor", to: "diagnosis" },
    { icon: "☀️", label: "Weather", to: "weather" },
    { icon: "📅", label: "Consulting", to: "consult" },
    { icon: "🛒", label: "Marketplace", to: "market" },
    { icon: "💳", label: "Wallet", to: "wallet" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[color:var(--fn-muted)]">Good morning</p>
          <h2 className="truncate text-2xl font-bold">Amina Musa 👋</h2>
          <p className="text-[color:var(--fn-muted)]">Kaduna, Nigeria</p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e6f4ea] text-2xl">
          👩🏾‍🌾
        </div>
      </div>
      <HeroImage emoji="🌾" alt="Farm overview" />
      <h3 className="mt-3 mb-2 text-base font-bold">Quick actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.to}
            onClick={() => go(a.to)}
            className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-[#edf4ef] px-3 py-3 text-center font-bold text-[#183420] hover:bg-[#dcecdf]"
          >
            <span aria-hidden>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <Card>
        <strong>AI recommendation</strong>
        <p className="mt-1">
          Apply organic mulch to conserve soil moisture this week.
        </p>
      </Card>
    </>
  );
}

function GardenScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>My Home Garden</PageTitle>
      <HeroImage emoji="🪴" alt="Home garden" />
      <div className="my-2.5 grid grid-cols-3 gap-2">
        {[
          ["84", "Health score"],
          ["4", "Active crops"],
          ["3", "Tasks today"],
        ].map(([b, s]) => (
          <div
            key={s}
            className="rounded-2xl bg-[color:var(--fn-light)] p-3 text-center"
          >
            <b className="block text-xl text-[color:var(--fn-green)]">{b}</b>
            <span className="text-[11px] text-[color:var(--fn-muted)]">{s}</span>
          </div>
        ))}
      </div>
      <Card>
        <h3 className="mb-1 text-base font-bold">Kitchen Garden</h3>
        <p>Tomato, pepper, herbs and ginger seedlings.</p>
        <SecondaryButton onClick={() => go("calendar")}>
          View garden calendar
        </SecondaryButton>
      </Card>
    </>
  );
}

function CalendarScreen() {
  return (
    <>
      <PageTitle>Garden Calendar</PageTitle>
      <Card>
        <b>Today</b>
        <p>08:00 — Water ginger seedboxes</p>
        <p>17:00 — Inspect tomato leaves</p>
      </Card>
      <Card>
        <b>This week</b>
        <p>Apply compost • Transplant seedlings • Check irrigation</p>
      </Card>
      <Notice>Task scheduling is represented as a static prototype action.</Notice>
    </>
  );
}

function WeatherScreen() {
  return (
    <>
      <PageTitle>Weather</PageTitle>
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-[#e7f6ec] to-[#fff8dc] p-4">
        <span className="text-5xl" aria-hidden>
          ⛅
        </span>
        <div>
          <b className="block text-3xl">27°C</b>
          <p>Partly cloudy</p>
        </div>
      </div>
      <div className="my-2.5 grid grid-cols-3 gap-2">
        {[
          ["62%", "Humidity"],
          ["20%", "Rain"],
          ["10", "km/h wind"],
        ].map(([b, s]) => (
          <div
            key={s}
            className="rounded-2xl bg-[color:var(--fn-light)] p-3 text-center"
          >
            <b className="block text-xl text-[color:var(--fn-green)]">{b}</b>
            <span className="text-[11px] text-[color:var(--fn-muted)]">{s}</span>
          </div>
        ))}
      </div>
      <Card>
        <b>Farm tip</b>
        <p>Ensure good drainage in ginger beds and avoid waterlogging.</p>
      </Card>
    </>
  );
}

function DiagnosisScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>AI Crop Doctor</PageTitle>
      <HeroImage emoji="🍃" alt="Crop photo capture" />
      <Field label="Describe the symptom">
        <textarea
          className={inputCls + " min-h-[90px]"}
          defaultValue="Leaves are yellowing at the edges."
        />
      </Field>
      <PrimaryButton onClick={() => go("result")}>Analyse crop</PrimaryButton>
    </>
  );
}

function ResultScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>Diagnosis Result</PageTitle>
      <Card variant="success">
        <b>Likely nitrogen deficiency</b>
        <p>Confidence: 82%</p>
      </Card>
      <Card>
        <h3 className="mb-1 text-base font-bold">Recommended action</h3>
        <p>
          Apply organic fertiliser, maintain steady watering and monitor new
          leaves.
        </p>
      </Card>
      <PrimaryButton onClick={() => go("consult")}>Book agronomist</PrimaryButton>
    </>
  );
}

function ConsultScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>Book Consulting Session</PageTitle>
      <Field label="Topic">
        <select className={inputCls}>
          <option>Crop Health</option>
          <option>Home Gardening</option>
          <option>Commercial Farming</option>
        </select>
      </Field>
      <Field label="Consultant">
        <select className={inputCls}>
          <option>Dr. Adebayo — Agronomist</option>
          <option>Mrs. Okeke — Home Gardening</option>
        </select>
      </Field>
      <Field label="Date">
        <input className={inputCls} type="date" defaultValue="2026-07-15" />
      </Field>
      <Field label="Time">
        <select className={inputCls}>
          <option>10:00 AM</option>
          <option>2:00 PM</option>
        </select>
      </Field>
      <PrimaryButton onClick={() => go("confirm")}>Book and pay</PrimaryButton>
    </>
  );
}

function ConfirmScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <div className="mx-auto my-4 grid h-[74px] w-[74px] place-items-center rounded-full bg-[color:var(--fn-green)] text-4xl text-white">
        ✓
      </div>
      <h2 className="text-center text-2xl font-bold">Session Confirmed</h2>
      <p className="text-center">
        15 July 2026 at 10:00 AM with Dr. Adebayo.
      </p>
      <Card>
        <b>Reference</b>
        <p>FN-CS-1048</p>
      </Card>
      <SecondaryButton onClick={() => go("dashboard")}>
        Return to dashboard
      </SecondaryButton>
    </>
  );
}

function CommunityScreen() {
  return (
    <>
      <PageTitle>Community</PageTitle>
      <Card>
        <b>Trending discussion</b>
        <p>Best natural treatment for aphids?</p>
        <small className="text-[color:var(--fn-muted)]">24 replies</small>
      </Card>
      <Card>
        <b>Upcoming webinar</b>
        <p>Growing ginger in small spaces</p>
      </Card>
    </>
  );
}

function LearningScreen() {
  return (
    <>
      <PageTitle>Learning Hub</PageTitle>
      {[
        ["Home Gardening Essentials", 72],
        ["Ginger Production", 48],
      ].map(([title, pct]) => (
        <Card key={title as string}>
          <b>{title}</b>
          <p>{pct}% complete</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#e7ece9]">
            <div
              className="h-full rounded-full bg-[color:var(--fn-green)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>
      ))}
    </>
  );
}

function MarketScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>Marketplace</PageTitle>
      <HeroImage emoji="🛍️" alt="Marketplace" />
      <Card>
        <b>Home Garden Starter Pack</b>
        <p>₦22,500</p>
        <SecondaryButton onClick={() => go("product")}>
          View product
        </SecondaryButton>
      </Card>
      <Card>
        <b>Organic Compost</b>
        <p>₦12,000</p>
      </Card>
    </>
  );
}

function ProductScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>Starter Pack</PageTitle>
      <Card>
        <h3 className="mb-1 text-base font-bold">Home Garden Starter Pack</h3>
        <p>
          Seeds, compost, nursery bags, watering guide and training access.
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[color:var(--fn-green)]">
          ₦22,500
        </h2>
      </Card>
      <PrimaryButton onClick={() => go("market")}>
        Back to marketplace
      </PrimaryButton>
    </>
  );
}

function InventoryScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>My Inventory</PageTitle>
      <Card>
        <b>Organic compost</b>
        <p>2 bags available</p>
      </Card>
      <Card variant="warning">
        <b>Vegetable seeds</b>
        <p>Low stock — 1 pack remaining</p>
      </Card>
      <PrimaryButton onClick={() => go("market")}>
        Reorder supplies
      </PrimaryButton>
    </>
  );
}

function FarmScreen() {
  return (
    <>
      <PageTitle>Register Farm</PageTitle>
      <Field label="Farm name">
        <input className={inputCls} defaultValue="Amina Musa Farm" />
      </Field>
      <Field label="Location">
        <input className={inputCls} defaultValue="Kaduna North" />
      </Field>
      <Field label="Farm size">
        <input className={inputCls} defaultValue="1.2 hectares" />
      </Field>
      <Notice>Location capture is represented as a static prototype action.</Notice>
    </>
  );
}

function HarvestScreen({ go }: { go: (s: ScreenId) => void }) {
  return (
    <>
      <PageTitle>Schedule Harvest</PageTitle>
      <Field label="Harvest date">
        <input className={inputCls} type="date" defaultValue="2026-09-20" />
      </Field>
      <Field label="Estimated yield">
        <input className={inputCls} defaultValue="500 kg" />
      </Field>
      <PrimaryButton onClick={() => go("sell")}>
        Continue to sell produce
      </PrimaryButton>
    </>
  );
}

function SellScreen() {
  return (
    <>
      <PageTitle>Sell Produce</PageTitle>
      <Card>
        <b>Fresh ginger</b>
        <p>Available: 500 kg</p>
        <p>Farm Naturale buy-back price: ₦1,200/kg</p>
      </Card>
      <Notice>
        Produce listing submission is represented as a static prototype action.
      </Notice>
    </>
  );
}

function WalletScreen() {
  return (
    <>
      <PageTitle>Wallet</PageTitle>
      <div className="mb-3 rounded-2xl bg-gradient-to-br from-[color:var(--fn-green)] to-[color:var(--fn-green-3)] p-5 text-white">
        <span className="block text-sm/5 opacity-90">Available balance</span>
        <b className="mt-1.5 block text-3xl">₦48,750</b>
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <b>Payment from buyer</b>
          <span className="font-extrabold text-[color:var(--fn-green)]">
            +₦40,000
          </span>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <b>Starter kit purchase</b>
          <span className="font-extrabold text-[#b33]">-₦25,000</span>
        </div>
      </Card>
    </>
  );
}

function CertificatesScreen() {
  return (
    <>
      <PageTitle>Certificates</PageTitle>
      <Card variant="certificate">
        <b>Home Gardening Essentials</b>
        <p>Issued 2 July 2026</p>
        <small className="text-[color:var(--fn-muted)]">
          Credential FN-LRN-2041
        </small>
      </Card>
    </>
  );
}
