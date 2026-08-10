"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { History, Search, Clock, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/app-store";

const filters = ["Toutes", "Aujourd'hui", "Cette semaine", "Ce mois"];

export function UserHistoryTab() {
  const { setView, setComparisonStep } = useAppStore();
  const [loading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("Toutes");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold">Historique</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Retrouvez vos comparaisons et recherches précédentes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            setComparisonStep(1);
            setView("compare");
          }}
        >
          <Search className="h-4 w-4 mr-2" />
          Nouvelle comparaison
        </Button>
      </motion.div>

      {/* Filtres */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === f
                ? "bg-brand text-black font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f}
          </button>
        ))}
        <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
      </motion.div>

      {/* État vide amélioré avec timeline */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-xl border border-dashed bg-card/40"
      >
        <div className="p-10 text-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4 mx-auto w-fit mb-4">
            <History className="h-10 w-10 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun historique de comparaison</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Chaque comparaison que vous effectuez sera enregistrée automatiquement
            pour vous permettre de retrouver facilement vos recherches.
          </p>
          <Button
            className="bg-brand text-black hover:bg-brand-hover rounded-full shadow-sm"
            onClick={() => {
              setComparisonStep(1);
              setView("compare");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Effectuer une comparaison
          </Button>
        </div>

        {/* Timeline vide */}
        <div className="border-t border-border/40 px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Activité récente</p>
          <div className="relative pl-6 border-l-2 border-muted space-y-4 py-1">
            {[
              { icon: Clock, text: "Première comparaison", sub: "À venir...", color: "text-muted-foreground/50" },
              { icon: Clock, text: "Devis enregistré", sub: "À venir...", color: "text-muted-foreground/50" },
              { icon: Clock, text: "Contrat souscrit", sub: "À venir...", color: "text-muted-foreground/50" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={`flex items-start gap-3 ${item.color}`}>
                  <div className="absolute -left-[9px] bg-card p-1">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs opacity-60">{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}