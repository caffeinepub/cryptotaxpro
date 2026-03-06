import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function Login() {
  const { login, isInitializing, isLoggingIn } = useInternetIdentity();
  const busy = isInitializing || isLoggingIn;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.72 0.16 195 / 0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, oklch(0.65 0.18 155 / 0.06) 0%, transparent 60%)",
        }}
      />

      {/* Grid pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.72 0.16 195) 1px, transparent 1px), linear-gradient(90deg, oklch(0.72 0.16 195) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-sm w-full"
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 glow-primary"
          >
            <TrendingUp className="w-7 h-7 text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
              CryptoTaxPro
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-xs">
              Your crypto tax calculator.
              <br />
              Simple, accurate, global.
            </p>
          </motion.div>
        </div>

        {/* Login card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full glass-card rounded-xl p-6 space-y-5"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Sign in to your account
            </h2>
            <p className="text-xs text-muted-foreground">
              Secure, decentralized authentication — no password required.
            </p>
          </div>

          <Button
            data-ocid="login.primary_button"
            onClick={login}
            disabled={busy}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-10"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isInitializing ? "Initializing..." : "Signing in..."}
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Internet Identity provides secure, private authentication on the
            Internet Computer network.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="flex flex-wrap justify-center gap-x-5 gap-y-1.5"
        >
          {["20+ countries", "1,000+ integrations", "FIFO / HIFO / LIFO"].map(
            (feat) => (
              <span
                key={feat}
                className="text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-primary inline-block" />
                {feat}
              </span>
            ),
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
