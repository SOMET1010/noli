"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export function UserReviewsTab() {
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
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
      >
        <h2 className="text-xl font-bold">Mes Avis</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Partagez votre expérience avec les assureurs.
        </p>
      </motion.div>

      {/* État vide */}
      <motion.div
        initial={{}}
        animate={{}}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border border-dashed bg-card/40 p-10 text-center"
      >
        <div className="rounded-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-4 mx-auto w-fit mb-4">
          <MessageSquare className="h-10 w-10 text-yellow-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Vous n&apos;avez pas encore laissé d&apos;avis
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Une fois votre contrat souscrit, vous pourrez noter et commenter votre expérience
          pour aider d&apos;autres utilisateurs à faire le bon choix.
        </p>
      </motion.div>
    </div>
  );
}
