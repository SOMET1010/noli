"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Shield,
  Bell,
  TrendingDown,
  Plus,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Types ── */
interface Quote {
  id: string;
  reference: string;
  status: string;
  estimatedPrice: number | null;
  finalPrice: number | null;
  createdAt: string;
  category?: { name: string } | null;
  offer?: { insurer?: { name: string } | null; name: string } | null;
}

/* ── Helpers ── */
const formatFCFA = (amount: number | null | undefined) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const statusLabel: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

/* ── Component ── */
export function UserDashboardTab() {
  const { user, setUserTab, setView, setComparisonStep } = useAppStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes`);
      if (res.ok) {
        const data = await res.json();
        setQuotes(Array.isArray(data) ? data : data.quotes ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const firstName = user.name?.split(" ")[0] || "Utilisateur";
  const pendingCount = quotes.filter((q) => q.status === "PENDING").length;
  const draftCount = quotes.filter((q) => q.status === "DRAFT").length;
  const activeContracts = quotes.filter((q) => q.status === "APPROVED").length;
  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const stats = [
    {
      label: "Devis en cours",
      value: pendingCount + draftCount,
      icon: FileText,
      color: "bg-brand/15 text-black dark:text-brand",
    },
    {
      label: "Contrats actifs",
      value: activeContracts,
      icon: Shield,
      color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    {
      label: "Notifications",
      value: 0,
      icon: Bell,
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    {
      label: "Économies réalisées",
      value: "—",
      icon: TrendingDown,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold">Bonjour, {firstName} 👋</h2>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans votre espace personnel NOLI Assurance.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="rounded-xl border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`rounded-lg p-2.5 ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Activité récente</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setUserTab("quotes")}
            >
              Voir tout
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : recentQuotes.length === 0 ? (
            <Card className="rounded-xl border bg-card">
              <CardContent className="p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucune activité récente. Commencez par demander un devis !
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentQuotes.map((q) => (
                <Card
                  key={q.id}
                  className="rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setUserTab("quotes")}
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-muted p-2 shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {q.offer?.name || q.category?.name || "Devis"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {q.reference} · {formatDate(q.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <p className="text-sm font-semibold">
                        {formatFCFA(q.estimatedPrice ?? q.finalPrice)}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColor[q.status] || ""
                        }`}
                      >
                        {statusLabel[q.status] || q.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
          <div className="space-y-3">
            <Card
              className="rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => {
                setComparisonStep(1);
                setView("compare");
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-brand/15 p-2.5 group-hover:bg-brand/25 transition-colors">
                  <Plus className="h-5 w-5 text-black dark:text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nouvelle comparaison</p>
                  <p className="text-xs text-muted-foreground">Comparer les offres d&apos;assurance</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setView("offers")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Parcourir les offres</p>
                  <p className="text-xs text-muted-foreground">Découvrir toutes les offres</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setUserTab("quotes")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Voir mes devis</p>
                  <p className="text-xs text-muted-foreground">Suivre mes demandes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}