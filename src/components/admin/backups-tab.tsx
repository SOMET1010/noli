"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database, Plus, Download, Trash2, Clock,
  Calendar, CheckCircle, XCircle, Loader2, Layers, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Backup {
  id: string;
  createdAt: string;
  filename: string;
  fileSize: number;
  type: "MANUAL" | "SCHEDULED" | "AUTO";
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
}

interface ScheduleConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  time?: string;
  dayOfWeek?: string;
  nextExecution?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " Go";
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  MANUAL: { label: "Manuel", cls: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400" },
  SCHEDULED: { label: "Planifié", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400" },
  AUTO: { label: "Auto", cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400" },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: typeof CheckCircle }> = {
  COMPLETED: { label: "Complété", cls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400", Icon: CheckCircle },
  FAILED: { label: "Échoué", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400", Icon: XCircle },
  IN_PROGRESS: { label: "En cours", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400", Icon: Loader2 },
};

export function BackupsTab() {
  const { toast } = useToast();

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false,
    frequency: "daily",
    time: "02:00",
    dayOfWeek: "1",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        // Réhydrate la planification enregistrée (sinon config en écriture seule).
        if (data.schedule && typeof data.schedule === "object") {
          setSchedule((s) => ({ ...s, ...data.schedule }));
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/backups", { method: "POST" });
      if (res.ok) {
        toast({ title: "Succès", description: "Export de sauvegarde créé. Vous pouvez le télécharger." });
        fetchBackups();
      } else {
        toast({ title: "Erreur", description: "Impossible de créer la sauvegarde.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/backups/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Succès", description: "Sauvegarde supprimée." });
        fetchBackups();
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau.", variant: "destructive" });
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const res = await fetch(`/api/admin/backups/${backup.id}`);
      if (!res.ok) {
        toast({ title: "Erreur", description: "Impossible de télécharger la sauvegarde.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau.", variant: "destructive" });
    }
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/admin/backups?action=schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, enabled: schedule.enabled }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.nextExecution) {
          setSchedule((s) => ({ ...s, nextExecution: data.nextExecution }));
        }
        toast({ title: "Succès", description: "Planification enregistrée." });
      } else {
        toast({ title: "Erreur", description: "Impossible d&apos;enregistrer.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur réseau.", variant: "destructive" });
    } finally {
      setSavingSchedule(false);
    }
  };

  // Stats
  const lastBackup = backups.length > 0 ? new Date(backups[0].createdAt).toLocaleString("fr-FR") : "—";
  const totalSize = backups.reduce((sum, b) => sum + (b.fileSize ?? 0), 0);

  const renderStats = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="bg-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dernière sauvegarde</p>
            <p className="font-semibold text-sm">{lastBackup}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taille totale</p>
            <p className="font-semibold text-sm">{formatFileSize(totalSize)}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nombre de sauvegardes</p>
            <p className="font-semibold text-sm">{backups.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderScheduleSection = () => (
    <Card className="bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Sauvegarde planifiée
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-backup">Activer les sauvegardes automatiques</Label>
          <Switch
            id="auto-backup"
            checked={schedule.enabled}
            onCheckedChange={(checked) => setSchedule((s) => ({ ...s, enabled: checked }))}
          />
        </div>

        {schedule.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select
                value={schedule.frequency}
                onValueChange={(v) => setSchedule((s) => ({ ...s, frequency: v as "daily" | "weekly" | "monthly" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {schedule.frequency === "daily" && (
              <div className="space-y-2">
                <Label>Heure</Label>
                <Input
                  type="time"
                  value={schedule.time || "02:00"}
                  onChange={(e) => setSchedule((s) => ({ ...s, time: e.target.value }))}
                />
              </div>
            )}

            {schedule.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Jour de la semaine</Label>
                <Select
                  value={schedule.dayOfWeek || "1"}
                  onValueChange={(v) => setSchedule((s) => ({ ...s, dayOfWeek: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Lundi</SelectItem>
                    <SelectItem value="2">Mardi</SelectItem>
                    <SelectItem value="3">Mercredi</SelectItem>
                    <SelectItem value="4">Jeudi</SelectItem>
                    <SelectItem value="5">Vendredi</SelectItem>
                    <SelectItem value="6">Samedi</SelectItem>
                    <SelectItem value="0">Dimanche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {schedule.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Jour du mois</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={schedule.dayOfWeek || "1"}
                  onChange={(e) => setSchedule((s) => ({ ...s, dayOfWeek: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Prochaine exécution</Label>
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm text-muted-foreground">
                {schedule.nextExecution
                  ? new Date(schedule.nextExecution).toLocaleString("fr-FR")
                  : "Non planifié"}
              </div>
            </div>
          </div>
        )}

        {schedule.enabled && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="bg-brand text-black hover:bg-brand-hover"
            >
              {savingSchedule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderBackupList = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-40" />
            </div>
          ))}
        </div>
      );
    }

    if (backups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Database className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Aucune sauvegarde</p>
          <p className="text-sm">Créez votre première sauvegarde manuellement ou planifiez-en une.</p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Fichier</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((b) => {
                const typeInfo = TYPE_BADGE[b.type] || TYPE_BADGE.MANUAL;
                const statusInfo = STATUS_BADGE[b.status] || STATUS_BADGE.COMPLETED;
                const StatusIcon = statusInfo.Icon;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-sm">
                      {new Date(b.createdAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{b.filename}</TableCell>
                    <TableCell className="text-sm">{formatFileSize(b.fileSize)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeInfo.cls}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusInfo.cls}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${b.status === "IN_PROGRESS" ? "animate-spin" : ""}`} />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={b.status !== "COMPLETED"}
                          onClick={() => handleDownload(b)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Télécharger
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la sauvegarde</AlertDialogTitle>
                              <AlertDialogDescription>
                                Voulez-vous vraiment supprimer <strong>{b.filename}</strong> ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-red-600 hover:bg-red-700">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {backups.map((b) => {
            const typeInfo = TYPE_BADGE[b.type] || TYPE_BADGE.MANUAL;
            const statusInfo = STATUS_BADGE[b.status] || STATUS_BADGE.COMPLETED;
            const StatusIcon = statusInfo.Icon;
            return (
              <Card key={b.id} className="bg-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{b.filename}</span>
                    <Badge variant="secondary" className={typeInfo.cls}>{typeInfo.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString("fr-FR")}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(b.fileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={statusInfo.cls}>
                      <StatusIcon className={`h-3 w-3 mr-1 ${b.status === "IN_PROGRESS" ? "animate-spin" : ""}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={b.status !== "COMPLETED"}
                      onClick={() => handleDownload(b)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Télécharger
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la sauvegarde</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-red-600 hover:bg-red-700">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sauvegardes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les sauvegardes de données et planifiez des sauvegardes automatiques.
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating} className="bg-brand text-black hover:bg-brand-hover">
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Nouvelle sauvegarde
        </Button>
      </div>

      {/* Note explicative */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Chaque sauvegarde génère un <strong>export des données</strong> (fichier
          téléchargeable) que vous pouvez conserver hors ligne. La base est hébergée
          sur Supabase, qui assure également des sauvegardes automatiques au niveau de
          l&apos;infrastructure ; la restauration se fait à ce niveau.
        </p>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Schedule Section */}
      {renderScheduleSection()}

      {/* Backup List */}
      <Card className="bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Liste des sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>{renderBackupList()}</CardContent>
      </Card>
    </div>
  );
}