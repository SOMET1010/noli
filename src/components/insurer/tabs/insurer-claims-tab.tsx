"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Info, Clock, CheckCircle2, Search, FileWarning, Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function InsurerClaimsTab() {
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
        <h2 className="text-2xl font-bold">Sinistres</h2>
        <p className="text-muted-foreground mt-1">
          Traitez les déclarations de sinistre liées à vos contrats.
        </p>
      </motion.div>

      {/* Bannière info améliorée */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-amber-50/30 p-4 dark:border-amber-900 dark:from-amber-950/30 dark:to-transparent"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 shrink-0">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-0.5">Gestion des sinistres</p>
          <p>
            Lorsqu&apos;un client déclare un sinistre sur un contrat actif, la déclaration apparaît ici.
            Vous pourrez évaluer le dossier, demander des pièces justificatives et traiter l&apos;indemnisation.
          </p>
        </div>
      </motion.div>

      {/* Barre de recherche */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un sinistre par référence, client ou contrat..."
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
            <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Sinistres ouverts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/40">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Traités</p>
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/10 to-amber-500/10 mx-auto mb-4">
            <FileWarning className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold">
            Aucune déclaration de sinistre
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Les sinistres déclarés par vos clients apparaîtront ici pour évaluation et traitement.
          </p>
        </div>

        {/* Workflow steps */}
        <div className="border-t border-border/40 px-6 py-4">
          <p className="text-xs text-muted-foreground font-medium mb-3">Workflow sinistre</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: 1, label: "Déclaration", icon: FileWarning, color: "text-red-500" },
              { step: 2, label: "Instruction", icon: Search, color: "text-amber-500" },
              { step: 3, label: "Évaluation", icon: Gavel, color: "text-blue-500" },
              { step: 4, label: "Indemnisation", icon: CheckCircle2, color: "text-green-500" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                    {item.step}
                  </div>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}