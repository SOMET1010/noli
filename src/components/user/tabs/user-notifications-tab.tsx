"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCheck,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

/* ── Relative time in French ── */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHr < 24) return `Il y a ${diffHr}h`;
  if (diffDay === 1) return "Hier";
  if (diffDay < 7) return `Il y a ${diffDay} jours`;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function typeBorderClass(type: string): string {
  switch (type) {
    case "SUCCESS":
      return "border-l-green-500";
    case "WARNING":
      return "border-l-amber-500";
    case "ERROR":
      return "border-l-red-500";
    default:
      return "border-l-muted-foreground/30";
  }
}

function typeBgClass(type: string): string {
  switch (type) {
    case "SUCCESS":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "WARNING":
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    case "ERROR":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function UserNotificationsTab() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications`);
      if (!res.ok) throw new Error();
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger les notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notification: Notification) => {
    if (notification.isRead) return;
    try {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme lu.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!user.id || unreadCount === 0) return;
    try {
      setMarkingAll(true);
      await fetch(`/api/notifications/read-all`, {
        method: "PUT",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast({
        title: "Notifications",
        description: "Toutes les notifications ont été marquées comme lues.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de tout marquer comme lu.",
        variant: "destructive",
      });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-bold">Notifications</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Restez informé de l&apos;actualité de vos demandes et contrats.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Tout marquer comme lu ({unreadCount})
          </Button>
        )}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center py-20"
        >
          <div className="rounded-full bg-muted p-5 mx-auto w-fit mb-5">
            <Bell className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Vous n&apos;avez pas de notifications pour le moment. Vos alertes
            apparaîtront ici lorsque vos devis seront traités ou que des
            échéances approcheront.
          </p>
        </motion.div>
      )}

      {/* Notifications list */}
      {!loading && notifications.length > 0 && (
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-3"
        >
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`rounded-xl border-l-[3px] transition-all hover:shadow-sm cursor-pointer ${
                typeBorderClass(n.type)
              } ${!n.isRead ? "bg-muted/30" : ""}`}
              onClick={() => handleMarkRead(n)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div
                  className={`rounded-lg p-2 shrink-0 ${typeBgClass(n.type)}`}
                >
                  {n.type === "ERROR" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}