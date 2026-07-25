import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeCheck,
  Bot,
  CalendarDays,
  Camera,
  CheckCircle2,
  CloudSun,
  CreditCard,
  GraduationCap,
  Leaf,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Sprout,
  Stethoscope,
  UserRound,
  Wallet as WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { APP_VERSION } from "@/lib/version";
import {
  addPlot,
  claimAdmin,
  completeModule,
  completeOnboarding,
  createGarden,
  createListing,
  deleteGarden,
  deletePlot,
  diagnoseCropPhoto,
  getDashboard,
  getHarvestHistory,
  getMe,
  getSellEligibility,
  getWaterReminders,
  getMobileAccess,
  getWallet,
  listConsultingRequests,
  listDiagnoses,
  listGardens,
  listModules,
  listOrders,
  listProducts,
  logGardenEvent,
  placeOrder,
  requestPayout,
  submitConsultingRequest,
  updateGarden,
  updateProfile,
  uploadCropPhoto,
} from "@/lib/farm.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farm Naturale — Grow, Learn, Prosper" },
      {
        name: "description",
        content:
          "Farm Naturale demo: sign up, run the AI Crop Doctor, browse the marketplace and manage your farm wallet — a working farmer-journey demo.",
      },
      { property: "og:title", content: "Farm Naturale — Grow, Learn, Prosper" },
      {
        property: "og:description",
        content:
          "A working demo of the Farm Naturale mobile app: real signup, AI crop diagnosis, marketplace and wallet.",
      },
    ],
  }),
  component: MobileApp,
});

type ScreenId =
  | "dashboard"
  | "garden"
  | "diagnosis"
  | "consult"
  | "learning"
  | "market"
  | "sell"
  | "wallet"
  | "certificates"
  | "harvests"
  | "orders";

const JOURNEY: { id: ScreenId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: Sprout },
  { id: "garden", label: "My Garden", icon: Leaf },
  { id: "harvests", label: "Harvests", icon: Package },
  { id: "diagnosis", label: "AI Crop Doctor", icon: Stethoscope },
  { id: "consult", label: "Consult Expert", icon: MessageCircle },
  { id: "market", label: "Marketplace", icon: ShoppingCart },
  { id: "sell", label: "Sell Produce", icon: Package },
  { id: "wallet", label: "Wallet", icon: WalletIcon },
  { id: "orders", label: "My Orders", icon: CreditCard },
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "certificates", label: "Certificates", icon: BadgeCheck },
];

function useSession() {
  const [session, setSession] = useState<import("@supabase/supabase-js").Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

function MobileApp() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-fn-green-2">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <TopBar signedIn={!!session} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden">
        {!session ? <AuthScreen /> : <AuthedRoot />}
      </div>
    </div>
  );
}

function AuthedRoot() {
  const accessFn = useServerFn(getMobileAccess);
  const { data, isLoading } = useQuery({
    queryKey: ["mobile-access"],
    queryFn: () => accessFn(),
    retry: false,
  });
  if (isLoading || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!data.allowed) {
    return (
      <main className="mx-auto grid max-w-md place-items-center px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-fn-panel">
          <h2 className="text-xl font-black text-fn-green-2">Admin account detected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin accounts cannot use the Farmer mobile app. Please sign in to the Web Admin instead.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Signed out");
            }}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }
  return <AppShell />;
}

function TopBar({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[78px] items-center justify-between gap-3 border-b border-border bg-card px-3.5 py-3 md:px-7">
      <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
        <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-primary text-sm font-black text-primary-foreground md:h-[50px] md:w-[50px] md:rounded-2xl md:text-base">
          FN
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-fn-green-2 md:text-[26px]">Farm Naturale</h1>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground md:text-sm">
            Grow • Learn • Prosper <span className="ml-1 opacity-70">· v{APP_VERSION}</span>
          </p>
        </div>
      </div>
      <nav className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-extrabold text-primary-foreground md:px-3 md:text-xs">
          Farmer App v{APP_VERSION}
        </span>
        {signedIn ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Signed out");
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-fn-navy transition-colors hover:bg-secondary"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : null}
      </nav>
    </header>
  );
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data: signRes, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!signRes.session) {
          setPendingVerify(email);
          toast.success("Check your email to verify your account");
        } else {
          toast.success("Welcome to Farm Naturale!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-[1180px] gap-5 px-3 py-8 md:grid-cols-[1fr_430px_1fr] md:px-5">
      <div className="hidden md:block" />
      <section className="mx-auto w-full max-w-[430px]">
        <div className="rounded-[44px] bg-fn-phone p-[13px] shadow-fn-phone">
          <div className="rounded-[30px] bg-fn-screen p-6">
            {pendingVerify ? (
              <div className="mb-4 rounded-xl border border-fn-gold/40 bg-fn-cream p-3 text-center">
                <p className="text-sm font-extrabold text-fn-green-2">📧 Verify your email</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  We sent a confirmation link to <span className="font-bold text-fn-navy">{pendingVerify}</span>. Click it, then sign in.
                </p>
              </div>
            ) : null}
            <div className="mb-5 flex flex-col items-center gap-2 pt-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
                FN
              </div>
              <h2 className="text-2xl font-black text-fn-green-2">Farm Naturale</h2>
              <p className="text-sm text-muted-foreground">
                {mode === "signup" ? "Start your farm journey" : "Welcome back"}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" ? (
                <input
                  required
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
                />
              ) : null}
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="password"
                placeholder="Password (min 6 chars)"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
              />
              <button
                disabled={loading}
                type="submit"
                className="grid w-full place-items-center rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={signInGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-extrabold text-fn-navy hover:bg-secondary disabled:opacity-60"
            >
              <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.4z" />
                <path fill="#FBBC05" d="M10.5 28.6a14.5 14.5 0 0 1 0-9.2l-7.9-6.1a24 24 0 0 0 0 21.4l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.2-8.3 2.2-6.3 0-11.6-4-13.5-9.4l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              Continue with Google
            </button>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("signin")} className="font-extrabold text-primary">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button onClick={() => setMode("signup")} className="font-semibold underline underline-offset-2 text-muted-foreground hover:text-fn-navy">
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </section>
      <div className="hidden md:block" />
    </main>
  );
}

// ---------------------------------------------------------------------------
// APP SHELL (post-auth)
// ---------------------------------------------------------------------------

function AppShell() {
  const meFn = useServerFn(getMe);
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => meFn(),
  });
  const [screen, setScreen] = useState<ScreenId>("dashboard");

  const go = (id: ScreenId) => {
    setScreen(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data.profile?.onboarded) {
    return <OnboardingScreen initialName={data.profile?.full_name ?? ""} />;
  }

  return (
    <main className="mx-auto grid w-full max-w-[1180px] flex-1 gap-5 px-3 py-4 pb-32 md:grid-cols-[240px_minmax(360px,430px)_300px] md:px-5 md:py-6 md:min-h-0 md:overflow-hidden">
      <JourneyRail active={screen} onSelect={go} />

      <section className="mx-auto w-full max-w-[430px]">
        <div className="rounded-[44px] bg-fn-phone p-[13px] shadow-fn-phone">
          <div className="flex h-[34px] items-center justify-between rounded-t-[30px] bg-fn-screen px-[18px] text-xs font-extrabold text-foreground">
            <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span aria-hidden>● ● ●</span>
          </div>
          <div className="h-[560px] overflow-y-auto rounded-b-[30px] bg-fn-screen p-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:h-[calc(100vh-200px)] md:max-h-[720px]">
            <ScreenView id={screen} go={go} />
          </div>
        </div>
      </section>

      <SidePanel screen={screen} me={data} />
      <MobileJourney active={screen} onSelect={go} />
    </main>
  );
}

function JourneyRail({ active, onSelect }: { active: ScreenId; onSelect: (s: ScreenId) => void }) {
  return (
    <aside className="hidden h-[780px] rounded-[20px] border border-border bg-card p-[18px] shadow-fn-panel md:block">
      <h2 className="mb-3 text-lg font-black text-fn-green-2">Farmer journey</h2>
      <div className="h-[710px] space-y-[7px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {JOURNEY.map((item, i) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={
                "flex min-h-10 w-full items-center gap-2 rounded-[11px] border px-3 py-2 text-left text-xs font-extrabold transition-colors " +
                (isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary")
              }
            >
              <span className={isActive ? "text-primary-foreground/75" : "text-muted-foreground"}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function MobileJourney({ active, onSelect }: { active: ScreenId; onSelect: (s: ScreenId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2.5 py-2.5 backdrop-blur md:hidden">
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

function SidePanel({ screen, me }: { screen: ScreenId; me: { profile: { full_name: string | null } | null; email: string | null; wallet_cents: number } }) {
  const notes: Record<ScreenId, string> = {
    dashboard: "Live counts of your gardens, crops and wallet.",
    garden: "Every plot and event is saved to the database, tied to your account.",
    diagnosis: "Uploads run through Gemini vision on Lovable AI Gateway — real disease detection.",
    consult: "Your question is answered by our AI agronomist Priya within seconds.",
    market: "Curated seed & input catalog, plus listings from other farmers.",
    sell: "List your harvest — buyers pay from their wallet, you get credited automatically.",
    wallet: "Every purchase debits, every sale credits. Payout to bank is simulated.",
    orders: "Order history with itemized receipts.",
    harvests: "Every harvest you log becomes a timeline entry — and unlocks selling on the marketplace.",
    learning: "Complete a short module to earn a shareable certificate.",
    certificates: "Every certificate has a unique verification code.",
  };
  return (
    <aside className="hidden h-[780px] rounded-[20px] border border-border bg-card p-5 shadow-fn-panel md:block">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-fn-light p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
          {(me.profile?.full_name ?? me.email ?? "F").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-fn-green-2">{me.profile?.full_name ?? "Farmer"}</p>
          <p className="truncate text-xs text-muted-foreground">{me.email}</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-fn-cream p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Wallet balance</p>
        <p className="mt-1 text-2xl font-black text-fn-green-2">₦{(me.wallet_cents / 100).toFixed(0)}</p>
      </div>
      <h2 className="mt-5 mb-2 text-lg font-black text-fn-green-2">About this screen</h2>
      <p className="rounded-[13px] border-l-4 border-primary bg-fn-light p-4 text-sm leading-6 text-foreground">
        {notes[screen]}
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// ONBOARDING
// ---------------------------------------------------------------------------

function OnboardingScreen({ initialName }: { initialName: string }) {
  const qc = useQueryClient();
  const [full_name, setName] = useState(initialName);
  const [farm_name, setFarmName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [land, setLand] = useState("");
  const [crops, setCrops] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const submit = useMutation({
    mutationFn: useServerFn(completeOnboarding),
    onSuccess: () => {
      toast.success("Welcome, farmer!");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const cropOptions = ["Ginger"];
  const goalOptions = ["Sell at market", "Organic certification", "Learn new methods", "Home consumption"];
  const toggle = (list: string[], v: string, set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <main className="mx-auto max-w-[520px] px-4 py-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-fn-panel">
        <h2 className="text-2xl font-black text-fn-green-2">Tell us about your farm</h2>
        <p className="mt-1 text-sm text-muted-foreground">Takes 30 seconds. You can update it later.</p>

        <div className="mt-5 space-y-3">
          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
            placeholder="Your name"
            value={full_name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
            placeholder="Farm name (e.g. Green Roots Ginger Farm)"
            value={farm_name}
            onChange={(e) => setFarmName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
              placeholder="Village / town"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
          </div>
          <input
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
            placeholder="Land size (acres)"
            type="number"
            step="0.1"
            value={land}
            onChange={(e) => setLand(e.target.value)}
          />

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Crops of interest</p>
            <div className="flex flex-wrap gap-2">
              {cropOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => toggle(crops, c, setCrops)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-extrabold " +
                    (crops.includes(c)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Goals</p>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((g) => (
                <button
                  key={g}
                  onClick={() => toggle(goals, g, setGoals)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-extrabold " +
                    (goals.includes(g)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground")
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={submit.isPending || !full_name}
            onClick={() =>
              submit.mutate({
                data: {
                  full_name,
                  farm_name,
                  phone,
                  village,
                  land_size_acres: Number(land) || 0,
                  crops_of_interest: crops,
                  goals,
                },
              })
            }
            className="mt-2 grid w-full place-items-center rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to app"}
          </button>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// SCREEN ROUTER
// ---------------------------------------------------------------------------

function ScreenView({ id, go }: { id: ScreenId; go: (s: ScreenId) => void }) {
  switch (id) {
    case "dashboard":
      return <DashboardScreen go={go} />;
    case "garden":
      return <GardenScreen />;
    case "diagnosis":
      return <DiagnosisScreen />;
    case "consult":
      return <ConsultScreen />;
    case "market":
      return <MarketScreen go={go} />;
    case "sell":
      return <SellScreen />;
    case "wallet":
      return <WalletScreen />;
    case "orders":
      return <OrdersScreen />;
    case "harvests":
      return <HarvestsScreen />;
    case "learning":
      return <LearningScreen />;
    case "certificates":
      return <CertificatesScreen />;
  }
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

function DashboardScreen({ go }: { go: (s: ScreenId) => void }) {
  const fn = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const me = useQuery({ queryKey: ["me"], queryFn: useServerFn(getMe) });
  const profile = me.data?.profile as { full_name?: string | null; farm_name?: string | null } | null;
  const farmName = profile?.farm_name?.trim();
  const fullName = profile?.full_name?.trim();
  const heading = farmName || fullName?.split(" ")[0] || "your farm";
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Welcome,</p>
          <h2 className="text-2xl font-black text-fn-green-2">{heading}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Let&apos;s grow something great today.</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-extrabold text-fn-navy hover:bg-secondary"
        >
          Edit profile
        </button>
      </div>
      {editing ? (
        <ProfileEditor
          initial={{
            full_name: me.data?.profile?.full_name ?? "",
            farm_name: (me.data?.profile as { farm_name?: string } | null)?.farm_name ?? "",
            phone: (me.data?.profile as { phone?: string } | null)?.phone ?? "",
            village: (me.data?.profile as { village?: string } | null)?.village ?? "",
            land_size_acres: (me.data?.profile as { land_size_acres?: number } | null)?.land_size_acres ?? 0,
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Gardens" value={data?.gardens ?? 0} />
        <StatCard label="Crops growing" value={data?.growing ?? 0} />
        <StatCard label="Diagnoses" value={data?.recent_diagnoses.length ?? 0} />
        <StatCard label="Wallet" value={`₦${((data?.wallet_cents ?? 0) / 100).toFixed(0)}`} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Quick icon={Leaf} label="Garden" onClick={() => go("garden")} />
        <Quick icon={Stethoscope} label="Crop Doctor" onClick={() => go("diagnosis")} />
        <Quick icon={ShoppingCart} label="Market" onClick={() => go("market")} />
        <Quick icon={MessageCircle} label="Consult" onClick={() => go("consult")} />
        <Quick icon={WalletIcon} label="Wallet" onClick={() => go("wallet")} />
        <Quick icon={GraduationCap} label="Learn" onClick={() => go("learning")} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-fn-gold" />
          <p className="text-sm font-extrabold text-fn-green-2">Today&apos;s advice</p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Warm and humid — perfect time to check for early leaf spot. Take a photo of any suspicious leaf and let the AI
          Crop Doctor diagnose it.
        </p>
      </div>

      {(data?.recent_diagnoses.length ?? 0) > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-extrabold text-fn-green-2">Recent diagnoses</p>
          <ul className="mt-2 space-y-1 text-sm">
            {data!.recent_diagnoses.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{d.disease}</span>
                <span className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-fn-green-2">{value}</p>
    </div>
  );
}

function ProfileEditor({
  initial,
  onClose,
}: {
  initial: { full_name: string; farm_name: string; phone: string; village: string; land_size_acres: number };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [full_name, setName] = useState(initial.full_name);
  const [farm_name, setFarmName] = useState(initial.farm_name);
  const [phone, setPhone] = useState(initial.phone);
  const [village, setVillage] = useState(initial.village);
  const [land, setLand] = useState(String(initial.land_size_acres ?? ""));
  const save = useMutation({
    mutationFn: useServerFn(updateProfile),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-fn-panel">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Edit profile</p>
      <div className="space-y-2">
        <input value={full_name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <input value={farm_name} onChange={(e) => setFarmName(e.target.value)} placeholder="Farm name"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="grid grid-cols-2 gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="Village / town"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <input value={land} type="number" step="0.1" onChange={(e) => setLand(e.target.value)} placeholder="Land size (acres)"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="flex gap-2">
          <button
            onClick={() =>
              save.mutate({
                data: {
                  full_name: full_name || undefined,
                  farm_name,
                  phone,
                  village,
                  land_size_acres: Number(land) || 0,
                },
              })
            }
            disabled={save.isPending || !full_name}
            className="flex-1 rounded-xl bg-primary py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-extrabold text-fn-navy hover:bg-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Quick({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-fn-light p-3 text-center text-[11px] font-extrabold text-fn-green-2 transition-colors hover:bg-primary/10"
    >
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// GARDEN
// ---------------------------------------------------------------------------

function GardenScreen() {
  const qc = useQueryClient();
  const fn = useServerFn(listGardens);
  const { data } = useQuery({ queryKey: ["gardens"], queryFn: () => fn() });
  const reminders = useQuery({ queryKey: ["water-reminders"], queryFn: useServerFn(getWaterReminders) });
  const [newName, setNewName] = useState("");
  const [newCrop, setNewCrop] = useState<Record<string, string>>({});
  const create = useMutation({ mutationFn: useServerFn(createGarden), onSuccess: () => { setNewName(""); qc.invalidateQueries({ queryKey: ["gardens"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); } });
  const plant = useMutation({ mutationFn: useServerFn(addPlot), onSuccess: () => qc.invalidateQueries() });
  const rename = useMutation({
    mutationFn: useServerFn(updateGarden),
    onSuccess: () => { toast.success("Garden updated"); qc.invalidateQueries({ queryKey: ["gardens"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: useServerFn(deleteGarden),
    onSuccess: () => { toast.success("Garden deleted"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-black text-fn-green-2">My Home Garden</h2>

      {(reminders.data ?? []).some((r) => r.due) ? (
        <div className="rounded-2xl border border-fn-gold/40 bg-fn-cream p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-fn-navy">💧 Watering reminders</p>
          <ul className="mt-2 space-y-1">
            {reminders.data!.filter((r) => r.due).map((r) => (
              <li key={r.plot_id} className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-fn-green-2">{r.crop} · {r.garden}</span>
                <span className="text-muted-foreground">
                  {r.last_watered_at ? `${r.days_since}d since last water` : `not watered yet · ${r.days_since}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Add a new garden</p>
        <div className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Backyard patch"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => newName && create.mutate({ data: { name: newName } })}
            disabled={create.isPending || !newName}
            className="grid place-items-center rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(data?.gardens ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No gardens yet. Add your first one above.
        </div>
      ) : null}

      {(data?.gardens ?? []).map((g) => {
        const plots = data!.plots.filter((p) => p.garden_id === g.id);
        return (
          <div key={g.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-fn-green-2">{g.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {plots.length} plots{g.size_sqm ? ` · ${g.size_sqm} sqm` : ""}
                  {g.location ? ` · ${g.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const name = window.prompt("Rename garden", g.name);
                    if (name && name.trim() && name !== g.name) rename.mutate({ data: { id: g.id, name: name.trim() } });
                  }}
                  className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-extrabold text-fn-navy hover:bg-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${g.name}" and all its plots?`)) remove.mutate({ data: { id: g.id } });
                  }}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {plots.map((p) => (
                <PlotRow key={p.id} plot={p} />
              ))}
              {plots.length === 0 ? (
                <p className="rounded-lg bg-fn-light px-2 py-1.5 text-[11px] text-muted-foreground">
                  No crops planted here yet.
                </p>
              ) : null}
            </div>

            <div className="mt-2 flex gap-2">
              <select
                value={newCrop[g.id] ?? "Ginger"}
                onChange={(e) => setNewCrop({ ...newCrop, [g.id]: e.target.value })}
                className="flex-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
              >
                <option value="Ginger">Ginger</option>
              </select>
              <button
                onClick={() => {
                  const crop = newCrop[g.id] || "Ginger";
                  if (!crop) return;
                  plant.mutate({ data: { garden_id: g.id, crop } });
                  setNewCrop({ ...newCrop, [g.id]: "" });
                }}
                className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground"
              >
                Plant
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlotRow({ plot }: { plot: { id: string; crop: string; status: string; planted_on: string } }) {
  const qc = useQueryClient();
  const logFn = useServerFn(logGardenEvent);
  const log = useMutation({
    mutationFn: (input: { plot_id: string; kind: string; note?: string }) => logFn({ data: input }),
    onSuccess: (_res, vars) => {
      toast.success(vars.kind === "watered" ? "Watering logged" : "Harvest logged");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Action failed"),
  });
  const remove = useMutation({
    mutationFn: useServerFn(deletePlot),
    onSuccess: () => { toast.success("Plot removed"); qc.invalidateQueries(); },
  });
  return (
    <div className="flex items-center justify-between rounded-lg bg-fn-light px-2 py-1.5">
      <div>
        <p className="text-xs font-extrabold text-fn-green-2">{plot.crop}</p>
        <p className="text-[10px] text-muted-foreground">
          Planted {new Date(plot.planted_on).toLocaleDateString()} · {plot.status}
        </p>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => log.mutate({ plot_id: plot.id, kind: "watered", note: "Watered" })}
          disabled={log.isPending}
          className="rounded-md bg-card px-2 py-1 text-[10px] font-extrabold text-fn-navy hover:bg-secondary"
        >
          Water
        </button>
        <button
          onClick={() => log.mutate({ plot_id: plot.id, kind: "harvested", note: "Harvested" })}
          disabled={log.isPending || plot.status === "harvested"}
          className="rounded-md bg-primary px-2 py-1 text-[10px] font-extrabold text-primary-foreground"
        >
          Harvest
        </button>
        <button
          onClick={() => { if (window.confirm("Remove this plot?")) remove.mutate({ data: { id: plot.id } }); }}
          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-700 hover:bg-red-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI CROP DOCTOR
// ---------------------------------------------------------------------------

function DiagnosisScreen() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDiagnoses);
  const list = useQuery({ queryKey: ["diagnoses"], queryFn: () => listFn() });
  const upload = useServerFn(uploadCropPhoto);
  const diagnose = useServerFn(diagnoseCropPhoto);

  const [crop, setCrop] = useState("");
  const [busy, setBusy] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [openCase, setOpenCase] = useState<null | (typeof list.data extends (infer U)[] | undefined ? U : never)>(null);
  const [latest, setLatest] = useState<null | {
    disease: string | null; confidence: number | null; severity: string | null; treatment: string | null; prevention: string | null; summary: string | null;
  }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const run = async () => {
    if (!dataUrl) {
      toast.error("Please select a photo of the plant first");
      return;
    }
    setBusy(true);
    setLatest(null);
    try {
      const { path } = await upload({ data: { data_url: dataUrl, filename: "leaf.jpg" } });
      const result = await diagnose({ data: { photo_path: path, crop } });
      setLatest(result);
      qc.invalidateQueries({ queryKey: ["diagnoses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Diagnosis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Diagnosis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">AI Crop Doctor</h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileRef}
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="hidden"
        />
        {dataUrl ? (
          <img src={dataUrl} alt="leaf preview" className="mx-auto max-h-56 rounded-xl object-cover" />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-fn-light py-8"
          >
            <Camera className="h-8 w-8 text-primary" />
            <p className="text-sm font-extrabold text-fn-green-2">Take or choose a photo</p>
            <p className="text-[11px] text-muted-foreground">Point at the affected leaf</p>
          </button>
        )}
        {dataUrl ? (
          <button onClick={() => fileRef.current?.click()} className="mt-2 w-full text-center text-[11px] font-extrabold text-primary">
            Choose a different photo
          </button>
        ) : null}
      </div>

        <select
          value={crop || "Ginger"}
          onChange={(e) => setCrop(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="Ginger">Ginger</option>
        </select>

      <button
        onClick={run}
        disabled={busy || !dataUrl}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        {busy ? "Analyzing…" : "Diagnose with AI"}
      </button>

      {latest ? (
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-fn-green-2">{latest.disease}</p>
            <span className="rounded-full bg-fn-light px-2 py-0.5 text-[10px] font-extrabold text-fn-navy">
              {Math.round((latest.confidence || 0) * 100)}% confident
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold uppercase text-muted-foreground">Severity: {latest.severity}</p>
          {latest.summary ? <p className="mt-2 text-sm text-foreground">{latest.summary}</p> : null}
          {latest.treatment ? (
            <div className="mt-2">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Treatment</p>
              <p className="text-sm text-foreground">{latest.treatment}</p>
            </div>
          ) : null}
          {latest.prevention ? (
            <div className="mt-2">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Prevention</p>
              <p className="text-sm text-foreground">{latest.prevention}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {(list.data?.length ?? 0) > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Case history — tap to review</p>
          <div className="space-y-2">
            {list.data!.map((d) => (
              <button
                key={d.id}
                onClick={() => setOpenCase(d)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2 text-left transition-colors hover:bg-fn-light"
              >
                {d.photo_url ? (
                  <img src={d.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-fn-light" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-fn-green-2">{d.disease}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {d.crop} · {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[10px] font-extrabold text-fn-navy">
                  {Math.round((d.confidence ?? 0) * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {openCase ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpenCase(null)}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-black text-fn-green-2">{openCase.disease}</p>
                <p className="text-[11px] text-muted-foreground">{openCase.crop || "Ginger"} · {new Date(openCase.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setOpenCase(null)} className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-extrabold text-white">Close</button>
            </div>
            {openCase.photo_url ? <img src={openCase.photo_url} alt="" className="mt-3 w-full rounded-xl object-cover" /> : null}
            <p className="mt-3 text-[11px] font-bold uppercase text-muted-foreground">
              Severity: {openCase.severity} · {Math.round((openCase.confidence ?? 0) * 100)}% confident
            </p>
            {openCase.summary ? <p className="mt-2 text-sm">{openCase.summary}</p> : null}
            {openCase.treatment ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Recommended treatment</p>
                <p className="text-sm">{openCase.treatment}</p>
              </div>
            ) : null}
            {openCase.prevention ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Prevention</p>
                <p className="text-sm">{openCase.prevention}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONSULT
// ---------------------------------------------------------------------------

function ConsultScreen() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["consults"], queryFn: useServerFn(listConsultingRequests) });
  const submit = useMutation({
    mutationFn: useServerFn(submitConsultingRequest),
    onSuccess: () => {
      setQ("");
      setCrop("");
      qc.invalidateQueries({ queryKey: ["consults"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const [q, setQ] = useState("");
  const [crop, setCrop] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Ask an agronomist</h2>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3">
        <input
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          placeholder="Crop (optional)"
          className="mb-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          rows={3}
          placeholder="Type your question…"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => q.trim().length > 3 && submit.mutate({ data: { question: q, crop } })}
          disabled={submit.isPending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send question
        </button>
      </div>

      <div className="space-y-2">
        {(list.data ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">
              You asked · {new Date(r.created_at).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-foreground">{r.question}</p>
            {r.reply ? (
              <div className="mt-3 rounded-xl bg-fn-light p-3">
                <p className="text-[11px] font-bold uppercase text-primary">Amara · Agronomist</p>
                <p className="mt-1 text-sm text-foreground">{r.reply}</p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">Awaiting reply…</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MARKETPLACE
// ---------------------------------------------------------------------------

function MarketScreen({ go: _go }: { go: (s: ScreenId) => void }) {
  void _go;
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products"], queryFn: useServerFn(listProducts) });
  const [receipt, setReceipt] = useState<null | { product_title: string; unit: string; unit_price_cents: number; qty: number; total_cents: number; remaining_stock: number }>(null);
  const buy = useMutation({
    mutationFn: useServerFn(placeOrder),
    onSuccess: (res) => {
      const r = (res as { receipt?: typeof receipt }).receipt;
      if (r) setReceipt(r);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Purchase failed"),
  });
  const [q, setQ] = useState("");
  const items = (products.data ?? []).filter(
    (p) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Marketplace</h2>
      </div>

      {receipt ? (
        <div className="rounded-2xl border border-primary/40 bg-fn-light p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase text-primary">✅ Purchase confirmed</p>
            <button onClick={() => setReceipt(null)} className="text-[11px] font-extrabold text-fn-navy underline">Dismiss</button>
          </div>
          <p className="mt-2 text-sm font-extrabold text-fn-green-2">{receipt.product_title}</p>
          <div className="mt-2 space-y-1 text-xs text-foreground">
            <p className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-bold">{receipt.qty} {receipt.unit}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Unit price</span><span className="font-bold">₦{(receipt.unit_price_cents/100).toFixed(0)}</span></p>
            <p className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Total paid</span><span className="font-black text-fn-navy">₦{(receipt.total_cents/100).toFixed(0)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Remaining stock</span><span className="font-bold">{receipt.remaining_stock} {receipt.unit}{receipt.remaining_stock === 0 ? " (sold out)" : ""}</span></p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search seeds, tools, inputs"
          className="w-full bg-transparent py-2 text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-2">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} className="h-24 w-full rounded-lg object-cover" />
            ) : (
              <div className="h-24 w-full rounded-lg bg-fn-light" />
            )}
            <p className="mt-2 line-clamp-2 text-[11px] font-extrabold text-fn-green-2">{p.title}</p>
            <p className="text-[10px] text-muted-foreground">{p.category}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-black text-fn-navy">₦{(p.price_cents / 100).toFixed(0)}</span>
              <button
                disabled={buy.isPending}
                onClick={() => buy.mutate({ data: { product_id: p.id, qty: 1 } })}
                className="rounded-lg bg-primary px-2 py-1 text-[10px] font-extrabold text-primary-foreground disabled:opacity-60"
              >
                Buy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SELL PRODUCE
// ---------------------------------------------------------------------------

function SellScreen() {
  const qc = useQueryClient();
  const eligibility = useQuery({ queryKey: ["sell-eligibility"], queryFn: useServerFn(getSellEligibility) });
  const eligible = eligibility.data?.eligible ?? false;
  const gateMessage = eligibility.data?.message ?? null;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Produce");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [stock, setStock] = useState("10");
  const [description, setDescription] = useState("");
  const create = useMutation({
    mutationFn: useServerFn(createListing),
    onSuccess: () => {
      toast.success("Your harvest is listed!");
      setTitle(""); setDescription(""); setPrice("");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sell-eligibility"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Sell your harvest</h2>
      </div>

      {!eligible && eligibility.isSuccess ? (
        <div className="rounded-2xl border border-fn-gold/50 bg-fn-cream p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-fn-navy">🔒 Selling locked</p>
          <p className="mt-1 text-[12px] text-muted-foreground">{gateMessage}</p>
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <fieldset disabled={!eligible} className="space-y-2 disabled:opacity-60">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product name (e.g. Fresh Ginger Rhizomes)"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
            <option>Produce</option><option>Seeds</option><option>Inputs</option><option>Tools</option>
          </select>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
            <option>kg</option><option>pack</option><option>bag</option><option>bunch</option><option>unit</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price ₦"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" placeholder="Stock qty"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description"
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <button
          disabled={create.isPending || !title || !price || !eligible}
          onClick={() =>
            create.mutate({
              data: {
                title, category, description,
                price_cents: Math.round(Number(price) * 100),
                unit, stock: Number(stock) || 1,
              },
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {eligible ? "List for sale" : "Log a harvest to unlock selling"}
        </button>
        </fieldset>
      </div>
      <p className="rounded-xl border border-border bg-fn-cream p-3 text-[11px] text-muted-foreground">
        Your listing appears on the Marketplace instantly. When another farmer buys it, ₦ get credited to your wallet automatically.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WALLET
// ---------------------------------------------------------------------------

function WalletScreen() {
  const qc = useQueryClient();
  const w = useQuery({ queryKey: ["wallet"], queryFn: useServerFn(getWallet) });
  const payout = useMutation({
    mutationFn: useServerFn(requestPayout),
    onSuccess: () => { toast.success("Payout requested"); qc.invalidateQueries(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const [amt, setAmt] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <WalletIcon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Wallet</h2>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-fn-green-2 to-fn-navy p-4 text-primary-foreground shadow-fn-panel">
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">Available balance</p>
        <p className="mt-1 text-3xl font-black">₦{((w.data?.balance_cents ?? 0) / 100).toFixed(0)}</p>
        <p className="mt-1 text-[11px] opacity-80">Earn more by selling harvest on the marketplace</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Request payout to bank</p>
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Amount ₦"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => amt && payout.mutate({ data: { amount_cents: Math.round(Number(amt) * 100) } })}
            disabled={payout.isPending || !amt}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
          >
            Payout
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Transactions</p>
        <div className="space-y-1">
          {(w.data?.transactions ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-2">
              <div>
                <p className="text-xs font-extrabold text-fn-green-2">{t.reason}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()} · {t.kind}
                </p>
              </div>
              <p className={"text-sm font-black " + (t.kind === "credit" ? "text-primary" : "text-fn-navy")}>
                {t.kind === "credit" ? "+" : "-"}₦{(t.amount_cents / 100).toFixed(0)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

function OrdersScreen() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: useServerFn(listOrders) });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">My Orders</h2>
      </div>
      {(orders.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No orders yet. Buy something from the marketplace to see it here.
        </div>
      ) : null}
      {(orders.data ?? []).map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase text-primary">{o.status}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
          </div>
          <ul className="mt-2 space-y-1">
            {o.order_items.map((it) => (
              <li key={it.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  {it.title} × {it.qty}
                </span>
                <span className="font-extrabold text-fn-navy">
                  ₦{((it.unit_price_cents * it.qty) / 100).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-black text-fn-green-2">
            <span>Total</span>
            <span>₦{(o.total_cents / 100).toFixed(0)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LEARNING & CERTIFICATES
// ---------------------------------------------------------------------------

function LearningScreen() {
  return <LearningScreenInner />;
}

function HarvestsScreen() {
  const list = useQuery({ queryKey: ["harvests"], queryFn: useServerFn(getHarvestHistory) });
  const rows = list.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Harvest history</h2>
      </div>
      <p className="text-xs text-muted-foreground">Every time you tap Harvest on a plot, it lands here.</p>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No harvests logged yet. Plant ginger in a garden, then tap Harvest when it's ready.
        </div>
      ) : (
        <ol className="relative space-y-3 border-l-2 border-primary/30 pl-4">
          {rows.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[22px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-primary ring-4 ring-background" />
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-extrabold text-fn-green-2">{h.crop} · {h.garden}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(h.occurred_at).toLocaleString()}</p>
                {h.note ? <p className="mt-1 text-xs text-foreground">{h.note}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LearningScreenInner() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["modules"], queryFn: useServerFn(listModules) });
  const complete = useMutation({
    mutationFn: useServerFn(completeModule),
    onSuccess: () => {
      toast.success("Module completed! Certificate issued.");
      qc.invalidateQueries();
    },
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Learning</h2>
      </div>
      {(data.data?.modules ?? []).map((m) => (
        <div key={m.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-fn-green-2">{m.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.summary}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{m.duration_min} min</p>
            </div>
            {m.completed ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
          </div>
          {openId === m.id ? (
            <div className="mt-2 rounded-xl bg-fn-light p-3 text-xs leading-6 text-foreground">
              {m.body}
              {!m.completed ? (
                <button
                  onClick={() => complete.mutate({ data: { module_id: m.id } })}
                  disabled={complete.isPending}
                  className="mt-3 w-full rounded-xl bg-primary py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
                >
                  Mark complete & earn certificate
                </button>
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => setOpenId(m.id)}
              className="mt-2 w-full rounded-xl border border-border bg-card py-2 text-xs font-extrabold text-fn-navy hover:bg-secondary"
            >
              {m.completed ? "Review" : "Start module"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function CertificatesScreen() {
  const data = useQuery({ queryKey: ["modules"], queryFn: useServerFn(listModules) });
  const certs = data.data?.certificates ?? [];
  const mods = data.data?.modules ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-black text-fn-green-2">Certificates</h2>
      </div>
      {certs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Complete a learning module to earn your first certificate.
        </div>
      ) : null}
      {certs.map((c) => {
        const m = mods.find((x) => x.id === c.module_id);
        return (
          <div key={c.id} className="rounded-2xl border-2 border-fn-gold bg-gradient-to-br from-fn-cream to-card p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-6 w-6 text-fn-gold" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Certificate of completion</p>
                <p className="text-sm font-black text-fn-green-2">{m?.title ?? "Farm Naturale Module"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
            <p className="mt-1 font-mono text-[11px] text-fn-navy">Verify code: {c.code}</p>
          </div>
        );
      })}
    </div>
  );
}

// Unused icons kept to preserve imports
void CalendarDays;
void UserRound;
