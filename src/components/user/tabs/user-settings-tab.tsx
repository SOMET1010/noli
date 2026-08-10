"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Settings,
  Lock,
  Mail,
  Globe,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

/* ── Component ── */
export function UserSettingsTab() {
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Email notifications
  const [emailNotif, setEmailNotif] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!user.id) return;
    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors du changement de mot de passe");
      }
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été changé avec succès." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-xl font-bold">Paramètres</h2>
        <p className="text-muted-foreground text-sm mt-1">Configurez votre compte et vos préférences.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account settings */}
        <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="bg-card rounded-xl border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="size-5 text-brand" />
                Paramètres du compte
              </CardTitle>
              <CardDescription>Gérez vos préférences de notification et de langue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Notifications par e-mail</p>
                    <p className="text-xs text-muted-foreground">Recevez les alertes de devis par e-mail</p>
                  </div>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>

              <Separator />

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Langue</p>
                    <p className="text-xs text-muted-foreground">Langue de l&apos;interface</p>
                  </div>
                </div>
                <span className="text-sm bg-muted rounded-full px-3 py-1">Français</span>
              </div>

              <Separator />

              {/* Theme */}
              {mounted && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">Thème</p>
                      <p className="text-xs text-muted-foreground">Apparence de l&apos;interface</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button
                      className={`rounded-md p-1.5 transition-colors ${theme === "light" ? "bg-card shadow-sm" : "hover:bg-card/50"}`}
                      onClick={() => setTheme("light")}
                      aria-label="Thème clair"
                    >
                      <Sun className="size-4" />
                    </button>
                    <button
                      className={`rounded-md p-1.5 transition-colors ${theme === "dark" ? "bg-card shadow-sm" : "hover:bg-card/50"}`}
                      onClick={() => setTheme("dark")}
                      aria-label="Thème sombre"
                    >
                      <Moon className="size-4" />
                    </button>
                    <button
                      className={`rounded-md p-1.5 transition-colors ${theme === "system" ? "bg-card shadow-sm" : "hover:bg-card/50"}`}
                      onClick={() => setTheme("system")}
                      aria-label="Thème système"
                    >
                      <Monitor className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="bg-card rounded-xl border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="size-5 text-brand" />
                Sécurité
              </CardTitle>
              <CardDescription>Modifiez votre mot de passe pour sécuriser votre compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s-currentPassword">Mot de passe actuel</Label>
                <div className="relative">
                  <Input id="s-currentPassword" type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }} placeholder="Mot de passe actuel" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPw((v) => !v)} aria-label="Afficher/Masquer">
                    {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-newPassword">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input id="s-newPassword" type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }} placeholder="Nouveau mot de passe" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPw((v) => !v)} aria-label="Afficher/Masquer">
                    {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input id="s-confirmPassword" type={showConfirmPw ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} placeholder="Confirmez" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPw((v) => !v)} aria-label="Afficher/Masquer">
                    {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              <div className="pt-2">
                <Button className="bg-brand text-black hover:bg-brand-hover" onClick={handlePasswordChange} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                  {changingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Changer le mot de passe
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Danger zone */}
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card className="border-destructive/30 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="size-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>Actions irréversibles sur votre compte.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Supprimer mon compte</p>
                <p className="text-xs text-muted-foreground">
                  Cette action est irréversible. Toutes vos données seront supprimées définitivement.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0">
                    Supprimer le compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera définitivement votre compte et toutes les données associées.
                      Cette action ne peut pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => toast({ title: "Fonctionnalité non disponible", description: "La suppression de compte n'est pas encore disponible." })}
                    >
                      Supprimer définitivement
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}