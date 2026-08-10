"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Save,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  CheckCircle,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

/* ── Helpers ── */
const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/* ── Component ── */
export function UserProfileTab() {
  const { user, setUser } = useAppStore();
  const { toast } = useToast();

  /* ── State ── */
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  /* ── Fetch profile ── */
  const fetchProfile = useCallback(async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/profile`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      const p: UserProfile = data.profile;
      setProfile(p);
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setPhone(p.phone);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user.id, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Save profile ── */
  const handleSaveProfile = async () => {
    if (!user.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, firstName, lastName, phone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la sauvegarde");
      }
      const newName = `${firstName} ${lastName}`.trim();
      setUser({ ...user, name: newName });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations personnelles ont été enregistrées.",
      });
      fetchProfile();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de sauvegarder.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async () => {
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
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été changé avec succès.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Impossible de changer le mot de passe.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="text-xl font-bold">Mon Profil</h2>
        <p className="text-muted-foreground text-sm mt-1">Gérez vos informations personnelles et votre sécurité.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="bg-card rounded-xl border">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="size-[100px] rounded-full bg-brand text-black flex items-center justify-center text-2xl font-bold select-none">
                  {profile ? getInitials(profile.firstName, profile.lastName) : "U"}
                </div>
                <div className="absolute bottom-1 right-1 size-7 rounded-full bg-background border border-border flex items-center justify-center">
                  <Camera className="size-3.5 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-1">
                {profile?.name || `${firstName} ${lastName}`.trim() || "Utilisateur"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{profile?.email || ""}</p>
              <Separator className="w-full mb-4" />
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{profile?.email || ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{profile?.phone ? `+225 ${profile.phone}` : "Non renseigné"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="size-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary" className="text-xs">{profile?.role || "utilisateur"}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    Membre depuis {profile?.createdAt ? formatDate(profile.createdAt) : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card className="bg-card rounded-xl border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="size-5 text-brand" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>Modifiez vos nom, prénom et numéro de téléphone.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="u-firstName">Prénom</Label>
                    <Input id="u-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="u-lastName">Nom</Label>
                    <Input id="u-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-phone">Téléphone</Label>
                  <Input id="u-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro de téléphone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" value={profile?.email || ""} disabled className="opacity-60 cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground">L&apos;adresse e-mail ne peut pas être modifiée.</p>
                </div>
                <div className="pt-2">
                  <Button className="bg-brand text-black hover:bg-brand-hover" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Change password */}
          <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Card className="bg-card rounded-xl border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="size-5 text-brand" />
                  Changer le mot de passe
                </CardTitle>
                <CardDescription>Assurez la sécurité de votre compte avec un mot de passe fort.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="u-currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input id="u-currentPassword" type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }} placeholder="Votre mot de passe actuel" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowCurrent((v) => !v)} aria-label="Afficher/Masquer">
                      {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-newPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input id="u-newPassword" type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }} placeholder="Nouveau mot de passe" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowNew((v) => !v)} aria-label="Afficher/Masquer">
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-xs text-destructive">Le mot de passe doit contenir au moins 6 caractères.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input id="u-confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} placeholder="Confirmez le nouveau mot de passe" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm((v) => !v)} aria-label="Afficher/Masquer">
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
                  )}
                </div>
                {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
                <div className="pt-2">
                  <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                    {changingPassword ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
                    Changer le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}