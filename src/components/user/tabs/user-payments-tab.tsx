"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CreditCard, Smartphone, Wifi, CheckCircle2, Info, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Types ── */
interface Contract {
  id: number | string;
  reference: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  premium: number | null;
  insurer?: { name: string } | null;
  offer?: { name: string } | null;
}

/* ── Helpers ── */
const formatFCFA = (amount: number | null | undefined) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";
};
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const paymentMethods = [
  { icon: Smartphone, name: "Mobile Money", description: "Orange Money, MTN MoMo, Moov Money", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
  { icon: Wifi, name: "Wave", description: "Paiement instantané", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  { icon: CreditCard, name: "Carte bancaire", description: "Visa, Mastercard", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
];

export function UserPaymentsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(Array.isArray(data) ? data : data.contracts ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const active = contracts.filter((c) => c.status === "ACTIVE");
  const totalPremium = active.reduce((sum, c) => sum + (c.premium || 0), 0);
  const nextRenewal = active
    .map((c) => c.endDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime())[0] as string | undefined;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-xl font-bold">Paiements</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Suivez les primes de vos contrats et leurs échéances.
        </p>
      </motion.div>

      {/* Récapitulatif (calculé sur les contrats réels) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border bg-gradient-to-br from-green-50 to-green-50/30 dark:from-green-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Prime mensuelle totale</p>
            <p className="text-lg font-bold tabular-nums">{formatFCFA(totalPremium)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {active.length > 0 ? `${active.length} contrat${active.length > 1 ? "s" : ""} actif${active.length > 1 ? "s" : ""}` : "Aucun contrat actif"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-50/30 dark:from-blue-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Contrats actifs</p>
            <p className="text-lg font-bold tabular-nums">{active.length}</p>
            <p className="text-xs text-muted-foreground mt-1">En cours</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-gradient-to-br from-purple-50 to-purple-50/30 dark:from-purple-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Prochaine échéance</p>
            <p className="text-lg font-bold">{formatDate(nextRenewal ?? null)}</p>
            <p className="text-xs text-muted-foreground mt-1">Renouvellement</p>
          </CardContent>
        </Card>
      </div>

      {/* Échéancier des contrats */}
      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
          <div className="rounded-full bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-3 mx-auto w-fit mb-3">
            <CreditCard className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold mb-1">Aucune prime à régler</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Après la souscription d&apos;un contrat, la prime et ses échéances apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Vos contrats & primes</h3>
          {active.map((c) => (
            <Card key={c.id} className="rounded-xl border bg-card">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-lg bg-muted p-2.5 shrink-0">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.insurer?.name || c.offer?.name || "Contrat"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Réf : {c.reference} · échéance {formatDate(c.endDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{formatFCFA(c.premium)}</p>
                  <p className="text-xs text-muted-foreground">/ mois</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note honnête sur le règlement */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Le règlement des primes s&apos;effectue directement auprès de votre assureur. Le paiement
          en ligne intégré arrivera prochainement.
        </p>
      </div>

      {/* Moyens de paiement acceptés (informatif) */}
      <div>
        <h3 className="text-base font-semibold mb-4">Moyens de paiement acceptés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card key={method.name} className="rounded-xl border bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${method.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{method.name}</p>
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground/30" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
