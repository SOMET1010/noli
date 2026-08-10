"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Info, Search, FileText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function InsurerContractsTab() {
  const [loading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold">Contrats</h2>
        <p className="text-muted-foreground mt-1">
          Suivez les contrats souscrits via vos offres d&apos;assurance.
        </p>
      </motion.div>

      {/* Bannière info plus visuelle */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-start gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-blue-50/30 p-4 dark:border-blue-900 dark:from-blue-950/30 dark:to-transparent"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 shrink-0">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-0.5">Suivi des contrats</p>
          <p>
            Les contrats apparaissent automatiquement après approbation et finalisation d&apos;un devis.
            Vous pourrez consulter les détails, gérer les avenants et suivre les échéances.
          </p>
        </div>
      </motion.div>

      {/* Ligne de recherche */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contrat par client, offre ou référence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/40">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Contrats actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/40">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/40">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Clients souscripteurs</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* État vide amélioré */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-xl border border-dashed bg-card/40"
      >
        <div className="p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/10 to-green-500/10 mx-auto mb-4">
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold">
            Aucun contrat souscrit
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Les contrats seront visibles ici après l&apos;approbation et la finalisation d&apos;un devis par un client.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="border-t border-border/40 px-6 py-4">
          <p className="text-xs text-muted-foreground font-medium mb-3">Pipeline de contractualisation</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Devis en attente", value: "0", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
              { label: "Devis approuvés", value: "0", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
              { label: "Contrats signés", value: "0", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg p-3 text-center ${item.color}`}>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}