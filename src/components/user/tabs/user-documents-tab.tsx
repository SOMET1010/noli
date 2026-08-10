"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  FileCheck,
  FileText,
  Receipt,
  Download,
  Lock,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadAttestationPDF } from "@/lib/generate-pdf";

const docCategories = [
  {
    icon: FileCheck,
    title: "Attestations d'assurance",
    description: "Attestations valides pour chaque contrat souscrit.",
    color: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
    badge: "PDF",
  },
  {
    icon: FileText,
    title: "Conditions Générales",
    description: "CGV applicables à vos contrats d'assurance.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
    badge: "PDF",
  },
  {
    icon: Receipt,
    title: "Quittances de paiement",
    description: "Reçus et justificatifs de vos primes.",
    color: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
    badge: "PDF",
  },
];

interface Contract {
  id: string;
  reference: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  premium: number | null;
  insurer: { name: string } | null;
  offer: { name: string } | null;
}

export function UserDocumentsTab() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/user/contracts");
        const data = await res.json();
        if (res.ok) setContracts(data.contracts || []);
      } catch {
        // keep empty
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");

  const handleDownload = (contract: Contract) => {
    downloadAttestationPDF({
      reference: contract.reference,
      insurerName: contract.insurer?.name || "Assureur",
      offerName: contract.offer?.name || null,
      premium: contract.premium,
      startDate: contract.startDate,
      endDate: contract.endDate,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-bold">Mes Documents</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Retrouvez tous vos documents d&apos;assurance en un seul endroit.
        </p>
      </motion.div>

      {/* Attestations de vos contrats actifs */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-green-500" />
          Attestations disponibles
        </h3>

        {activeContracts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/40 p-8 text-center">
            <div className="rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 mx-auto w-fit mb-4">
              <FolderOpen className="h-8 w-8 text-blue-500" />
            </div>
            <h4 className="font-semibold mb-1">Aucun document disponible</h4>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Vos attestations apparaîtront ici automatiquement dès qu&apos;un contrat
              sera actif (devis approuvé par l&apos;assureur).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeContracts.map((contract) => (
              <Card key={contract.id} className="rounded-xl border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 shrink-0">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {contract.insurer?.name || "Assureur"}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {contract.offer?.name || "Formule"}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">
                      {contract.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden md:inline-flex text-xs text-muted-foreground items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {contract.endDate
                        ? new Date(contract.endDate).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Durée indéterminée"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleDownload(contract)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Attestation PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Types de documents disponibles */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-base font-semibold mb-4">Types de documents disponibles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {docCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card key={cat.title} className="rounded-xl border bg-card hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-default">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`rounded-lg p-2.5 ${cat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {cat.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{cat.title}</h4>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground mt-6">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-green-500" />
            Documents sécurisés
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-blue-500" />
            Téléchargement PDF
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Mise à jour automatique
          </div>
        </div>
      </motion.div>
    </div>
  );
}
