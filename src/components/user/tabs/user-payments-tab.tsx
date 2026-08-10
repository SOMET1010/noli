"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Smartphone, Wifi, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

const paymentMethods = [
  {
    icon: Smartphone,
    name: "Mobile Money",
    description: "Orange Money, MTN MoMo, Moov Money",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    borderColor: "hover:border-orange-300 dark:hover:border-orange-700",
  },
  {
    icon: Wifi,
    name: "Wave",
    description: "Paiement instantané",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    borderColor: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  {
    icon: Smartphone,
    name: "Orange Money",
    description: "Paiement par USSD ou app",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    borderColor: "hover:border-yellow-300 dark:hover:border-yellow-700",
  },
  {
    icon: CreditCard,
    name: "Carte bancaire",
    description: "Visa, Mastercard",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
    borderColor: "hover:border-purple-300 dark:hover:border-purple-700",
  },
];

export function UserPaymentsTab() {
  const [loading] = useState(false);
  const [autoPay, setAutoPay] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
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
        <h2 className="text-xl font-bold">Paiements</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos paiements et moyens de paiement.
        </p>
      </motion.div>

      {/* Récapitulatif */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className="rounded-xl border bg-gradient-to-br from-green-50 to-green-50/30 dark:from-green-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Prochain paiement</p>
            <p className="text-lg font-bold">— FCFA</p>
            <p className="text-xs text-muted-foreground mt-1">Aucun contrat actif</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-50/30 dark:from-blue-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Total payé</p>
            <p className="text-lg font-bold">0 FCFA</p>
            <p className="text-xs text-muted-foreground mt-1">Depuis la création</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-gradient-to-br from-purple-50 to-purple-50/30 dark:from-purple-950/20 dark:to-transparent">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Prochaines échéances</p>
            <p className="text-lg font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-1">Contrats à renouveler</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* État vide */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-xl border border-dashed bg-card/40 p-8 text-center"
      >
        <div className="rounded-full bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-3 mx-auto w-fit mb-3">
          <CreditCard className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-base font-semibold mb-1">Aucun paiement enregistré</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Après souscription, vos paiements et échéances seront visibles ici.
        </p>
      </motion.div>

      {/* Moyens de paiement améliorés */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-base font-semibold mb-4">Moyens de paiement acceptés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Card key={method.name} className={`rounded-xl border bg-card transition-all hover:shadow-md hover:-translate-y-0.5 cursor-default ${method.borderColor}`}>
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
      </motion.div>

      {/* Préférences de paiement */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="rounded-xl border bg-card">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-base font-semibold">Préférences de paiement</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Paiement automatique</p>
                <p className="text-xs text-muted-foreground">
                  Prélevez automatiquement les primes à chaque échéance
                </p>
              </div>
              <Switch checked={autoPay} onCheckedChange={setAutoPay} />
            </div>
            {autoPay && (
              <div className="flex items-center gap-2 rounded-lg bg-brand/10 p-3 text-xs text-[#8ab530]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Le paiement automatique sera activé dès votre premier contrat souscrit.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}