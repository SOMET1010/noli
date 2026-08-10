"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  TrendingUp,
  Clock,
  ShieldCheck,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalOffers: number;
  activeOffers: number;
  totalQuotes: number;
  pendingQuotes: number;
  approvedQuotes: number;
  rejectedQuotes: number;
  draftQuotes: number;
  totalCoverages: number;
  recentQuotes: {
    id: string;
    reference: string;
    status: string;
    estimatedPrice: number | null;
    createdAt: string;
    userName: string | null;
  }[];
}

const statusConfig: Record<string, { label: string; className: string; width: string }> = {
  DRAFT: { label: "Brouillons", className: "bg-muted", width: "w-full" },
  PENDING: { label: "En attente", className: "bg-yellow-500", width: "w-full" },
  APPROVED: { label: "Approuvés", className: "bg-emerald-500", width: "w-full" },
  REJECTED: { label: "Refusés", className: "bg-red-500", width: "w-full" },
};

export function InsurerAnalyticsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/insurer/stats");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Impossible de charger les statistiques.");
          return;
        }
        setStats(data);
      } catch {
        setError("Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <Card>
          <CardContent className="p-10 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {error || "Données indisponibles."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const acceptanceRate =
    stats.totalQuotes > 0
      ? Math.round((stats.approvedQuotes / stats.totalQuotes) * 100)
      : 0;

  const metricCards = [
    {
      label: "Total devis",
      value: String(stats.totalQuotes),
      description: "reçus sur la plateforme",
      icon: FileText,
    },
    {
      label: "Taux d'acceptation",
      value: `${acceptanceRate}%`,
      description: `${stats.approvedQuotes} devis approuvés`,
      icon: TrendingUp,
    },
    {
      label: "Devis en attente",
      value: String(stats.pendingQuotes),
      description: "à traiter",
      icon: Clock,
    },
    {
      label: "Offres actives",
      value: `${stats.activeOffers}/${stats.totalOffers}`,
      description: `${stats.totalCoverages} garanties configurées`,
      icon: ShieldCheck,
    },
  ];

  const statusCounts = [
    { status: "PENDING", count: stats.pendingQuotes },
    { status: "APPROVED", count: stats.approvedQuotes },
    { status: "REJECTED", count: stats.rejectedQuotes },
    { status: "DRAFT", count: stats.draftQuotes },
  ];
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Suivez les performances de vos offres et votre activité sur NOLI.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border bg-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status distribution */}
      <motion.div
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-xl border bg-card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Répartition des devis par statut</h3>
        </div>
        {stats.totalQuotes === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun devis reçu pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {statusCounts.map((s) => {
              const cfg = statusConfig[s.status];
              const pct = Math.round((s.count / stats.totalQuotes) * 100);
              return (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cfg.label}</span>
                    <span className="font-medium tabular-nums">
                      {s.count} <span className="text-muted-foreground">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cfg.className} transition-all duration-700`}
                      style={{ width: `${Math.round((s.count / maxStatus) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Recent quotes */}
      <motion.div
        initial={{ y: 16 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="rounded-xl border bg-card p-6"
      >
        <h3 className="text-sm font-semibold mb-4">Derniers devis reçus</h3>
        {stats.recentQuotes.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun devis récent.
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentQuotes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{q.reference}</p>
                  <p className="text-sm font-medium truncate">
                    {q.userName || "Client anonyme"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    {q.estimatedPrice
                      ? `${new Intl.NumberFormat("fr-FR").format(q.estimatedPrice)} FCFA`
                      : "—"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      q.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : q.status === "REJECTED"
                          ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300"
                          : q.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {statusConfig[q.status]?.label || q.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
