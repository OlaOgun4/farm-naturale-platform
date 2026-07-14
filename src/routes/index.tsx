import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import gingerFarm from "@/assets/ginger-farm.jpg";
import gingerSeedlings from "@/assets/ginger-seedlings.jpg";
import vegetableGarden from "@/assets/vegetable-garden.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farm Naturale — Mobile App Prototype" },
      {
        name: "description",
        content:
          "Native Farm Naturale mobile app UI covering login, dashboard, home garden, AI Crop Doctor, marketplace and wallet flows.",
      },
      { property: "og:title", content: "Farm Naturale — Mobile App Prototype" },
      {
        property: "og:description",
        content:
          "A React rebuild of the Farm Naturale cross-platform mobile app prototype.",
      },
    ],
  }),
  component: MobilePrototype,
});

type ScreenId =
  | "login"
  | "dashboard"
  | "garden"
  | "calendar"
  | "weather"
  | "diagnosis"
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
  { id: "login", label: "Login" },
  { id: "dashboard", label: "Dashboard" },
  { id: "garden", label: "My Home Garden" },
  { id: "calendar", label: "Garden Calendar" },
  { id: "weather", label: "Weather" },
  { id: "diagnosis", label: "AI Crop Doctor" },
  { id: "consult", label: "Consultation" },
  { id: "confirm", label: "Booking Confirmed" },
  { id: "community", label: "Community" },
  { id: "learning", label: "Learning" },
  { id: "market", label: "Marketplace" },
  { id: "product", label: "Product Detail" },
  { id: "inventory", label: "Inventory" },
  { id: "farm", label: "Register Farm" },
  { id: "harvest", label: "Harvest" },
  { id: "sell", label: "Sell Produce" },
  { id: "wallet", label: "Wallet" },
  { id: "certificates", label: "Certificates" },
];

function MobilePrototype() {
  const [screen, setScreen] = useState<ScreenId>("dashboard");

  const go = (next: ScreenId) => {
    setScreen(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />

      <main className="mx-auto grid max-w-[1180px] gap-5 px-3 py-4 pb-32 md:grid-cols-[240px_minmax(360px,430px)_300px] md:px-5 md:py-6">
        <JourneyRail active={screen} onSelect={go} />

        <section className="mx-auto w-full max-w-[430px]">
          <div className="rounded-[44px] bg-fn-phone p-[13px] shadow-fn-phone">
            <PhoneStatus />
            <div className="h-[720px] overflow-y-auto rounded-b-[30px] bg-fn-screen p-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Screen id={screen} go={go} />
            </div>
          </div>
        </section>

        <NotesPanel screen={screen} />
      </main>

      <MobileJourney active={screen} onSelect={go} />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex min-h-[78px] items-center justify-between gap-3 border-b border-border bg-card px-3.5 py-3 md:px-7">
      <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
        <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-primary text-sm font-black text-primary-foreground md:h-[50px] md:w-[50px] md:rounded-2xl md:text-base">
          FN
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-fn-green-2 md:text-[26px]">
            Farm Naturale
          </h1>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground md:text-sm">
            Grow • Learn • Prosper
          </p>
        </div>
      </div>
      <nav className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-extrabold text-primary-foreground md:px-3 md:text-xs">
          Mobile App
        </span>
        <Link
          to="/admin"
          className="rounded-full border border-border bg-card px-2.5 py-1.5 text-[11px] font-extrabold text-fn-navy transition-colors hover:bg-secondary md:px-3 md:text-xs"
        >
          Web Admin
        </Link>
      </nav>
    </header>
  );
}

function PhoneStatus() {
  return (
    <div className="flex h-[34px] items-center justify-between rounded-t-[30px] bg-fn-screen px-[18px] text-xs font-extrabold text-foreground">
      <span>9:41</span>
      <span aria-hidden>● ● ●</span>
    </div>
  );
}

function JourneyRail({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (screen: ScreenId) => void;
}) {
  return (
    <aside className="hidden h-[780px] rounded-[20px] border border-border bg-card p-[18px] shadow-fn-panel md:block">
      <h2 className="mb-3 text-lg font-black text-fn-green-2">Mobile flow</h2>
      <div className="h-[710px] space-y-[7px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOURNEY.map((item, index) => {
          const activeItem = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={
                "flex min-h-10 w-full items-center gap-2 rounded-[11px] border px-3 py-2 text-left text-xs font-extrabold transition-colors " +
                (activeItem
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary")
              }
            >
              <span className={activeItem ? "text-primary-foreground/75" : "text-muted-foreground"}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function MobileJourney({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (screen: ScreenId) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2.5 py-2.5 backdrop-blur md:hidden">
      <p className="mx-auto mb-1.5 max-w-[520px] text-[11px] font-black text-muted-foreground">
        User journey
      </p>
      <div className="mx-auto flex max-w-[520px] gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOURNEY.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={
              "min-h-[38px] shrink-0 rounded-xl px-3 py-2 text-[11px] font-extrabold transition-colors " +
              (item.id === active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground")
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

const FLOW_NOTES: Record<ScreenId, string[]> = {
  login: ["Authentication entry", "Uses phone/password", "Routes into dashboard"],
  dashboard: ["Primary user hub", "Surfaces farm health", "Quick access to six core modules"],
  garden: ["Home garden overview", "Tracks crops, area and harvest", "Connects to calendar"],
  calendar: ["Task scheduling", "Today and upcoming care plan", "Adds garden task"],
  weather: ["Location advice", "Forecast card", "Watering recommendation"],
  diagnosis: ["AI-assisted triage", "Image + symptom input", "Escalates to agronomist"],
  consult: ["Expert booking", "Topic, mode and time", "Paid confirmation flow"],
  confirm: ["Post-payment state", "Reference code", "Calendar and video prep actions"],
  community: ["Peer learning", "Posts, replies and webinars", "Community engagement"],
  learning: ["Course progress", "Certificate path", "Continue learning action"],
  market: ["Input marketplace", "Compact product grid", "Product detail navigation"],
  product: ["Commerce detail", "Quantity selector", "Buy/cart actions"],
  inventory: ["Supplies tracking", "Low-stock status", "Reorder path"],
  farm: ["Commercial onboarding", "Crop/location capture", "Save farm action"],
  harvest: ["Harvest logistics", "Collection slots", "Schedule action"],
  sell: ["Produce buy-back", "Pricing and eligibility", "Value estimate"],
  wallet: ["Balance and movement", "Add/withdraw actions", "Transaction list"],
  certificates: ["Learning credentials", "Earned certificate", "Next milestone"],
};

function NotesPanel({ screen }: { screen: ScreenId }) {
  return (
    <aside className="hidden h-[780px] rounded-[20px] border border-border bg-card p-5 shadow-fn-panel md:block">
      <h2 className="mb-4 text-lg font-black text-fn-green-2">Flow notes</h2>
      <div className="rounded-[13px] border-l-4 border-primary bg-fn-light p-4 text-sm leading-7">
        {FLOW_NOTES[screen].map((note) => (
          <p key={note}>{note}</p>
        ))}
      </div>
      <div className="mt-5 grid gap-2 text-sm text-muted-foreground">
        <span>Palette: Farm green, navy, gold, cream</span>
        <span>Shell: native mobile phone frame</span>
        <span>Navigation: preserved prototype journey</span>
      </div>
    </aside>
  );
}

function Screen({ id, go }: { id: ScreenId; go: (screen: ScreenId) => void }) {
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
      return <ProductScreen />;
    case "inventory":
      return <InventoryScreen />;
    case "farm":
      return <FarmScreen />;
    case "harvest":
      return <HarvestScreen />;
    case "sell":
      return <SellScreen />;
    case "wallet":
      return <WalletScreen />;
    case "certificates":
      return <CertificatesScreen />;
  }
}

function ScreenTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {subtitle && <p className="text-[13px] font-semibold text-muted-foreground">{subtitle}</p>}
        <h2 className="truncate text-2xl font-black tracking-normal text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-accent text-[23px]">
      {children}
    </div>
  );
}

function PhotoHero({
  src,
  title,
  subtitle,
}: {
  src: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative my-3 h-[150px] overflow-hidden rounded-[18px] border border-border bg-fn-light">
      <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-fn-photo-overlay" />
      <div className="absolute inset-x-3.5 bottom-3 text-primary-foreground drop-shadow-sm">
        <strong className="block text-lg leading-tight">{title}</strong>
        <span className="text-xs font-semibold">{subtitle}</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`my-[11px] rounded-[17px] border border-border bg-card p-[15px] ${className}`}>
      {children}
    </div>
  );
}

function Thumb({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[13px] bg-accent text-[25px]">
      {children}
    </div>
  );
}

function ListItem({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[11px] border-b border-fn-soft-line py-2.5 last:border-b-0">
      <Thumb>{icon}</Thumb>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-black">{title}</strong>
        <p className="text-[13px] font-medium text-muted-foreground">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

function Badge({
  children,
  tone = "ok",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "info";
}) {
  const toneClass = {
    ok: "bg-fn-ok text-fn-ok-text",
    warn: "bg-fn-warn text-fn-warn-text",
    danger: "bg-fn-danger text-fn-danger-text",
    info: "bg-fn-info text-fn-info-text",
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${toneClass}`}>
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-h-11 rounded-[11px] bg-primary px-3.5 py-2.5 text-sm font-black text-primary-foreground transition-colors hover:bg-fn-green-2"
    >
      {children}
    </button>
  );
}

function SoftButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-h-11 rounded-[11px] bg-secondary px-3.5 py-2.5 text-sm font-black text-secondary-foreground transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2.5 block text-[13px] font-black">
      <span>{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "my-1.5 w-full rounded-[11px] border border-border bg-card px-3 py-[11px] text-base font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function BottomActions({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-[-18px] mt-3 flex gap-2 bg-fn-screen py-3 [&>*]:flex-1">{children}</div>;
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[13px] bg-fn-light p-[11px] text-center">
      <strong className="block text-xl font-black text-primary">{value}</strong>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-fn-progress">
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function LoginScreen({ go }: { go: (screen: ScreenId) => void }) {
  return (
    <>
      <PhotoHero
        src={gingerSeedlings}
        title="Grow with Farm Naturale"
        subtitle="Healthy ginger seedlings ready for transplanting"
      />
      <h2 className="mb-1 text-2xl font-black">Welcome back</h2>
      <p className="text-[13px] font-semibold text-muted-foreground">
        Access your Farm Naturale account
      </p>
      <Field label="Phone number">
        <input className={fieldClass} defaultValue="0803 123 4567" />
      </Field>
      <Field label="Password">
        <input className={fieldClass} type="password" defaultValue="password" />
      </Field>
      <BottomActions>
        <PrimaryButton onClick={() => go("dashboard")}>Login</PrimaryButton>
      </BottomActions>
      <Card className="border-l-4 border-l-primary bg-fn-light text-[13px]">
        <strong>Prototype access</strong>
        <p className="mt-1 text-muted-foreground">Use the prefilled details and select Login.</p>
      </Card>
    </>
  );
}

function DashboardScreen({ go }: { go: (screen: ScreenId) => void }) {
  const actions: { icon: string; label: string; to: ScreenId }[] = [
    { icon: "☀️", label: "Weather", to: "weather" },
    { icon: "📷", label: "Crop Doctor", to: "diagnosis" },
    { icon: "👩🏾‍💼", label: "Consultation", to: "consult" },
    { icon: "🛒", label: "Marketplace", to: "market" },
    { icon: "💬", label: "Community", to: "community" },
    { icon: "📅", label: "Calendar", to: "calendar" },
  ];

  return (
    <>
      <ScreenTitle title="Amina Musa 👋" subtitle="Good morning" action={<Avatar>👩🏾‍🌾</Avatar>} />
      <p className="-mt-3 mb-3 text-[13px] font-semibold text-muted-foreground">Kaduna, Nigeria</p>
      <Card className="relative overflow-hidden border-0 bg-fn-green-2 p-0 text-primary-foreground">
        <img src={gingerFarm} alt="Commercial ginger farm" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fn-card-overlay" />
        <div className="relative z-10 p-[15px]">
          <p className="text-xs font-bold opacity-90">Farm Naturale Ginger Farm</p>
          <h3 className="mt-1 text-lg font-black">Healthy field development and crop monitoring</h3>
          <div className="mt-8 grid grid-cols-[52px_1fr] gap-3">
            <Thumb>👩🏾‍🌾</Thumb>
            <div>
              <strong className="block">Commercial ginger farm</strong>
              <p className="text-xs font-semibold opacity-90">Health score 84 / 100</p>
              <Badge>Healthy • 2 tasks due today</Badge>
            </div>
          </div>
          <div className="mt-3">
            <SoftButton onClick={() => go("garden")}>Open My Home Garden</SoftButton>
          </div>
        </div>
      </Card>
      <h3 className="mb-2 mt-3 text-base font-black">Quick actions</h3>
      <div className="grid grid-cols-2 gap-[9px]">
        {actions.map((action) => (
          <button
            key={action.to}
            onClick={() => go(action.to)}
            className="min-h-[70px] rounded-xl border border-border bg-card px-3 py-3 text-xs font-black transition-colors hover:bg-secondary"
          >
            <span className="mb-1 block text-xl" aria-hidden>
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>
      <Card className="bg-fn-light">
        <strong>Smart recommendation</strong>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          Rain is likely tomorrow. Delay watering and inspect tomato leaves for early blight symptoms.
        </p>
        <div className="mt-3">
          <SoftButton onClick={() => go("weather")}>View forecast</SoftButton>
        </div>
      </Card>
    </>
  );
}

function GardenScreen({ go }: { go: (screen: ScreenId) => void }) {
  return (
    <>
      <ScreenTitle title="My Home Garden" />
      <PhotoHero src={gingerSeedlings} title="Healthy Ginger in Seedboxes" subtitle="Healthy seedlings ready for transplanting" />
      <div className="grid grid-cols-3 gap-2">
        <Metric value="25m²" label="Garden area" />
        <Metric value="4" label="Crop types" />
        <Metric value="2" label="Tasks due" />
      </div>
      <Card>
        <strong className="block text-base">Growing now</strong>
        <ListItem icon="🍅" title="Tomatoes" subtitle="Flowering • Harvest in 18 days" />
        <ListItem icon="🌶️" title="Peppers" subtitle="Vegetative • Good health" />
        <ListItem icon="🫚" title="Ginger" subtitle="Sprouting • Monitor moisture" />
      </Card>
      <BottomActions>
        <PrimaryButton onClick={() => go("calendar")}>Garden calendar</PrimaryButton>
        <SoftButton onClick={() => go("diagnosis")}>Check plant</SoftButton>
      </BottomActions>
    </>
  );
}

function CalendarScreen() {
  return (
    <>
      <ScreenTitle title="Garden Calendar" />
      <Card>
        <strong className="mb-2 block">📅 Today • 10 July</strong>
        <ListItem icon="💧" title="Water peppers" subtitle="Recommended before 8:00 AM" />
        <ListItem icon="🔎" title="Inspect tomatoes" subtitle="Check lower leaves for spots" />
      </Card>
      <Card>
        <strong className="mb-2 block">Upcoming</strong>
        <ListItem icon="12" title="Apply compost tea" subtitle="12 Jul" />
        <ListItem icon="15" title="Consultation session" subtitle="15 Jul" />
        <ListItem icon="18" title="Harvest herbs" subtitle="18 Jul" />
      </Card>
      <BottomActions>
        <PrimaryButton>+ Add garden task</PrimaryButton>
      </BottomActions>
    </>
  );
}

function WeatherScreen() {
  return (
    <>
      <ScreenTitle title="Weather & Advice" subtitle="Kaduna Today" />
      <Card className="bg-fn-weather-gradient">
        <div className="flex items-center justify-between">
          <div>
            <strong className="block text-[32px] leading-none">29°C</strong>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Humidity 68% • Wind 9 km/h</p>
          </div>
          <span className="text-[52px]" aria-hidden>
            ☀️
          </span>
        </div>
      </Card>
      <div className="grid grid-cols-4 gap-[7px]">
        {[
          ["Sat", "🌦️", "27°"],
          ["Sun", "🌧️", "25°"],
          ["Mon", "⛅", "28°"],
          ["Tue", "☀️", "30°"],
        ].map(([day, icon, temp]) => (
          <div key={day} className="rounded-xl border border-border bg-card px-1 py-2.5 text-center">
            <strong className="block text-xs">{day}</strong>
            <span className="block text-xl" aria-hidden>
              {icon}
            </span>
            <span className="text-xs font-black">{temp}</span>
          </div>
        ))}
      </div>
      <Card className="border-l-4 border-l-primary bg-fn-light">
        <strong>Advisory</strong>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          Rain probability is 70% tomorrow. Skip evening irrigation and ensure drainage channels are clear.
        </p>
      </Card>
      <BottomActions>
        <PrimaryButton>Update garden plan</PrimaryButton>
      </BottomActions>
    </>
  );
}

function DiagnosisScreen({ go }: { go: (screen: ScreenId) => void }) {
  return (
    <>
      <ScreenTitle title="AI Crop Doctor" />
      <Card className="bg-fn-light text-center">
        <div className="mx-auto grid h-[86px] w-[86px] place-items-center rounded-3xl bg-card text-5xl">🤖</div>
        <h3 className="mt-3 text-lg font-black">AI Crop Doctor</h3>
        <p className="text-[13px] font-semibold text-muted-foreground">Upload a clear image of the affected plant</p>
      </Card>
      <SoftButton>Upload or take plant photo</SoftButton>
      <textarea className={`${fieldClass} min-h-[70px]`} defaultValue="My tomato leaves have brown spots and yellow edges." />
      <BottomActions>
        <PrimaryButton>Analyse symptoms</PrimaryButton>
      </BottomActions>
      <Card className="bg-fn-ok">
        <strong>Likely issue</strong>
        <p className="mt-1 font-black text-fn-ok-text">Early blight • 72% confidence</p>
        <p className="mt-1 text-[13px] text-foreground">
          Remove affected leaves, avoid overhead watering and improve airflow. Escalate if symptoms spread within 48 hours.
        </p>
        <div className="mt-3">
          <PrimaryButton onClick={() => go("consult")}>Book an agronomist</PrimaryButton>
        </div>
      </Card>
    </>
  );
}

function ConsultScreen({ go }: { go: (screen: ScreenId) => void }) {
  return (
    <>
      <ScreenTitle title="Book Consultation" subtitle="Expert support" />
      <Card>
        <ListItem icon="👨🏾‍⚕️" title="Dr. Tunde Adebayo" subtitle="Agronomist • Crop health • 4.9 ★" />
      </Card>
      <Field label="Topic">
        <select className={fieldClass} defaultValue="crop">
          <option value="crop">Crop health diagnosis</option>
          <option value="garden">Home garden setup</option>
          <option value="commercial">Commercial farming</option>
        </select>
      </Field>
      <Field label="Consultation mode">
        <select className={fieldClass} defaultValue="video">
          <option value="video">Video call</option>
          <option value="voice">Voice call</option>
          <option value="visit">Farm visit</option>
        </select>
      </Field>
      <Field label="Date">
        <input className={fieldClass} type="date" defaultValue="2026-07-15" />
      </Field>
      <div className="mt-2 text-[13px] font-black">Available time</div>
      <div className="mt-1.5 flex flex-wrap gap-[7px]">
        {[
          ["10:00", true],
          ["11:30", false],
          ["14:00", false],
        ].map(([time, selected]) => (
          <button
            key={String(time)}
            className={
              "rounded-[11px] border px-3 py-2 text-xs font-black " +
              (selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")
            }
          >
            {time}
          </button>
        ))}
      </div>
      <Card className="bg-fn-light">
        <p className="text-[13px] font-semibold text-muted-foreground">Consultation fee</p>
        <strong className="text-[27px] font-black text-primary">₦7,500</strong>
      </Card>
      <BottomActions>
        <PrimaryButton onClick={() => go("confirm")}>Pay & confirm booking</PrimaryButton>
      </BottomActions>
    </>
  );
}

function ConfirmScreen({ go }: { go: (screen: ScreenId) => void }) {
  return (
    <>
      <div className="mx-auto my-5 grid h-[74px] w-[74px] place-items-center rounded-full bg-primary text-[42px] text-primary-foreground">
        ✓
      </div>
      <h2 className="text-center text-2xl font-black">Booking Confirmed</h2>
      <p className="text-center text-sm font-semibold text-muted-foreground">Paid ✅</p>
      <Card className="text-center">
        <strong className="block">Crop Health Consultation</strong>
        <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Dr. Tunde Adebayo</p>
        <p className="text-[13px] font-semibold text-muted-foreground">15 July 2026 • 10:00 AM • Video call</p>
        <Badge>Reference FN-CS-1048</Badge>
      </Card>
      <BottomActions>
        <PrimaryButton onClick={() => go("calendar")}>Add to calendar</PrimaryButton>
        <SoftButton onClick={() => go("dashboard")}>Test video</SoftButton>
      </BottomActions>
    </>
  );
}

function CommunityScreen() {
  return (
    <>
      <ScreenTitle title="Farmer Community" action={<SoftButton>+ Post</SoftButton>} />
      <Card className="border-l-4 border-l-primary">
        <strong>Grace Emmanuel</strong>
        <p className="text-[13px] font-semibold text-muted-foreground">Nasarawa • 2 hours ago</p>
        <p className="mt-2 text-sm">My pepper plants improved after switching to morning watering. Sharing the schedule that worked for me.</p>
        <Badge>24 helpful</Badge>
      </Card>
      <Card className="border-l-4 border-l-primary">
        <strong>Ibrahim Bello</strong>
        <p className="text-[13px] font-semibold text-muted-foreground">Kano • Yesterday</p>
        <p className="mt-2 text-sm">Does anyone have experience using neem spray for aphids on tomatoes?</p>
        <SoftButton>Reply</SoftButton>
      </Card>
      <Card className="bg-fn-light">
        <strong>Upcoming webinar</strong>
        <p className="text-[13px] font-semibold text-muted-foreground">Home Garden Pest Management</p>
        <PrimaryButton>Register free</PrimaryButton>
      </Card>
    </>
  );
}

function LearningScreen() {
  return (
    <>
      <ScreenTitle title="Learning Hub" subtitle="3 active" />
      {[
        ["Home Gardening Essentials", 75],
        ["Natural Pest Control", 45],
        ["Profitable Ginger Production", 60],
      ].map(([name, progress]) => (
        <Card key={String(name)}>
          <ListItem icon="🎓" title={String(name)} subtitle={`${progress}% complete`} />
          <ProgressBar value={Number(progress)} />
        </Card>
      ))}
      <BottomActions>
        <PrimaryButton>Continue learning</PrimaryButton>
      </BottomActions>
    </>
  );
}

function MarketScreen({ go }: { go: (screen: ScreenId) => void }) {
  const products = [
    ["🌱", "Vegetable Seed Pack", "₦4,500", "View"],
    ["🪴", "Organic Compost", "₦6,000", "Add"],
    ["💧", "Drip Kit", "₦18,500", "Add"],
    ["🧤", "Garden Tool Set", "₦12,000", "Add"],
  ];

  return (
    <>
      <ScreenTitle title="Marketplace" action={<Avatar>🛒</Avatar>} />
      <div className="grid grid-cols-2 gap-[9px]">
        {products.map(([icon, title, price, action]) => (
          <div key={title} className="rounded-[14px] border border-border bg-card p-[11px]">
            <div className="grid h-[75px] place-items-center rounded-xl bg-fn-cream text-[38px]">{icon}</div>
            <strong className="mt-2 block text-sm">{title}</strong>
            <p className="font-black text-primary">{price}</p>
            <SoftButton onClick={title === "Vegetable Seed Pack" ? () => go("product") : undefined}>{action}</SoftButton>
          </div>
        ))}
      </div>
    </>
  );
}

function ProductScreen() {
  return (
    <>
      <ScreenTitle title="Product Detail" subtitle="In stock" />
      <PhotoHero src={vegetableGarden} title="Home Garden Starter Pack" subtitle="Seedlings, inputs, tools and setup guidance" />
      <Card>
        <strong className="text-lg">Home Garden Starter Pack</strong>
        <p className="mt-2 text-sm text-muted-foreground">
          Seeds, compost, nursery bags, hand tools, planting guide and one virtual setup consultation.
        </p>
        <strong className="mt-3 block text-[27px] text-primary">₦22,500</strong>
      </Card>
      <Field label="Quantity">
        <select className={fieldClass} defaultValue="1">
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </Field>
      <BottomActions>
        <PrimaryButton>Buy now</PrimaryButton>
        <SoftButton>Add to cart</SoftButton>
      </BottomActions>
    </>
  );
}

function InventoryScreen() {
  return (
    <>
      <ScreenTitle title="My Inventory" action={<SoftButton>+ Add</SoftButton>} />
      <Card>
        <ListItem icon="🌱" title="Tomato seeds" subtitle="2 packs remaining" right={<Badge>Good</Badge>} />
        <ListItem icon="🪴" title="Organic compost" subtitle="3 kg remaining" right={<Badge tone="warn">Low</Badge>} />
        <ListItem icon="🧴" title="Neem spray" subtitle="750 ml remaining" right={<Badge>Good</Badge>} />
      </Card>
      <BottomActions>
        <PrimaryButton>Reorder low stock</PrimaryButton>
      </BottomActions>
    </>
  );
}

function FarmScreen() {
  return (
    <>
      <ScreenTitle title="Register Farm" subtitle="Commercial" />
      <PhotoHero src={gingerFarm} title="Register Commercial Farm" subtitle="Capture location, crop and cultivation area" />
      <Field label="Farm name">
        <input className={fieldClass} defaultValue="Amina Musa Ginger Farm" />
      </Field>
      <Field label="Crop focus">
        <select className={fieldClass} defaultValue="ginger">
          <option value="ginger">Ginger</option>
          <option value="tomato">Tomato</option>
          <option value="maize">Maize</option>
        </select>
      </Field>
      <Field label="Farm size">
        <input className={fieldClass} defaultValue="1.2 hectares" />
      </Field>
      <BottomActions>
        <SoftButton>Use current location</SoftButton>
        <PrimaryButton>Save farm</PrimaryButton>
      </BottomActions>
    </>
  );
}

function HarvestScreen() {
  return (
    <>
      <ScreenTitle title="Harvest Planner" subtitle="Ready soon" />
      <PhotoHero src={gingerFarm} title="Ginger Harvest Planning" subtitle="Coordinate maturity, collection and logistics" />
      <Field label="Harvest date">
        <input className={fieldClass} type="date" defaultValue="2026-09-20" />
      </Field>
      <Field label="Estimated yield">
        <input className={fieldClass} defaultValue="500 kg" />
      </Field>
      <div className="mt-2 flex gap-[7px]">
        <button className="rounded-[11px] border border-primary bg-primary px-3 py-2 text-xs font-black text-primary-foreground">Morning 8AM–12PM</button>
        <button className="rounded-[11px] border border-border bg-card px-3 py-2 text-xs font-black">Afternoon 1PM–4PM</button>
      </div>
      <BottomActions>
        <PrimaryButton>Schedule harvest</PrimaryButton>
      </BottomActions>
    </>
  );
}

function SellScreen() {
  return (
    <>
      <ScreenTitle title="Sell Produce" subtitle="Buy-back eligible" />
      <Card>
        <ListItem icon="🫚" title="Fresh Ginger" subtitle="Available: 500kg" />
        <strong className="mt-2 block text-[27px] text-primary">₦1,200/kg</strong>
      </Card>
      <BottomActions>
        <PrimaryButton>List for sale</PrimaryButton>
      </BottomActions>
      <Card className="border-l-4 border-l-primary bg-fn-light">
        <strong>Farm Naturale offer</strong>
        <p className="mt-1 text-[13px] text-muted-foreground">Indicative buy-back value: ₦575,000 after quality assessment.</p>
      </Card>
    </>
  );
}

function WalletScreen() {
  return (
    <>
      <ScreenTitle title="Wallet" action={<Avatar>💳</Avatar>} />
      <Card className="border-0 bg-fn-wallet-gradient text-primary-foreground">
        <p className="text-sm font-semibold opacity-90">Available balance</p>
        <strong className="mt-1 block text-[32px] leading-none">₦48,750.00</strong>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-[11px] bg-card px-3 py-2 text-sm font-black text-primary">Add money</button>
          <button className="flex-1 rounded-[11px] bg-primary-foreground/15 px-3 py-2 text-sm font-black text-primary-foreground">Withdraw</button>
        </div>
      </Card>
      <h3 className="mt-4 text-base font-black">Recent transactions</h3>
      <Card>
        <ListItem icon="💳" title="Buyer payment" subtitle="10 July 2026" right={<Badge>+₦40,000</Badge>} />
        <ListItem icon="💳" title="Consultation fee" subtitle="10 July 2026" right={<Badge tone="warn">-₦7,500</Badge>} />
        <ListItem icon="💳" title="Marketplace order" subtitle="10 July 2026" right={<Badge tone="warn">-₦12,000</Badge>} />
      </Card>
    </>
  );
}

function CertificatesScreen() {
  return (
    <>
      <ScreenTitle title="Certificates" subtitle="2 earned" />
      <Card className="border-l-4 border-l-primary">
        <ListItem icon="🏅" title="Home Gardening Essentials" subtitle="Issued 2 July 2026 • Credential FN-LRN-2041" />
        <PrimaryButton>View certificate</PrimaryButton>
      </Card>
      <Card className="bg-fn-light">
        <strong>Next certificate</strong>
        <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Natural Pest Control • 45% complete</p>
        <ProgressBar value={45} />
      </Card>
    </>
  );
}