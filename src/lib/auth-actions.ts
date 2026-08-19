import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reconcileAnonymousQuotes } from "@/lib/quotes-reconcile";
import { registerSchema, loginSchema, emailSchema } from "@/lib/validation";
import { getSessionProfile, getSupabaseServerClient } from "@/lib/auth-guard";
import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkForgotRateLimit,
  checkResetPasswordLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { validatePasswordPolicy } from "@/lib/password-policy";
import { logAudit } from "@/lib/audit";

/**
 * Actions d'authentification partagées entre les routes REST dédiées
 * (POST /api/auth/register, /login, /logout, /forgot, GET /api/auth/me)
 * et l'ancien endpoint unique POST /api/auth (rétro-compatibilité).
 */

/**
 * Détermine l'URL publique du site pour construire les liens envoyés par email
 * (réinitialisation de mot de passe). En production, l'application tourne derrière
 * un reverse-proxy (nginx / Caddy) : on privilégie donc l'origine RÉELLE de la
 * requête (en-têtes `x-forwarded-*`) afin que le lien pointe toujours vers le
 * domaine visité (ex. https://noli.ci) — même si la variable d'environnement
 * NEXT_PUBLIC_SITE_URL n'a pas été positionnée sur le serveur.
 *
 * Priorité :
 *   1. NEXT_PUBLIC_SITE_URL si elle est réellement configurée (≠ localhost) ;
 *   2. l'origine dérivée des en-têtes de la requête (proxy) ;
 *   3. en dernier recours, la valeur d'environnement ou localhost (dev).
 *
 * ⚠️ Le domaine résultant doit figurer dans la liste « Redirect URLs » du projet
 * Supabase (Authentication → URL Configuration), sinon Supabase ignore ce
 * paramètre et retombe sur son « Site URL ».
 */
function resolveSiteUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;

  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (host) return `${proto}://${host}`;

  return env || "http://localhost:3000";
}

/**
 * Traduit l'erreur de `supabase.auth.signUp` en message français exploitable.
 * Les cas reconnus (email existant, mot de passe faible, inscriptions désactivées,
 * rate limit email) sont distingués ; tout le reste retombe sur le message
 * générique (aucune énumération côté login/forgot n'est affectée).
 */
export function signUpErrorMessage(err: { code?: string; message?: string }): string {
  const code = (err.code || "").toLowerCase();
  const message = (err.message || "").toLowerCase();

  if (code.includes("already_exists") || message.includes("already registered") || message.includes("already been registered")) {
    return "Un compte existe déjà avec cette adresse email. Connectez-vous ou réinitialisez votre mot de passe.";
  }
  if (code.includes("weak_password") || message.includes("password should") || message.includes("at least")) {
    return "Le mot de passe ne respecte pas les exigences de sécurité. Utilisez au moins 8 caractères, une majuscule et un chiffre.";
  }
  if (code.includes("over_email_send_rate_limit") || code.includes("rate_limit") || message.includes("rate limit") || message.includes("too fast")) {
    return "Trop de demandes d'inscription pour cet email. Attendez quelques minutes avant de réessayer.";
  }
  if (code.includes("signup_disabled") || message.includes("signup") || message.includes("not allowed")) {
    return "L'inscription est momentanément indisponible. Réessayez plus tard ou contactez le support.";
  }
  if (code.includes("provider_disabled") || message.includes("disabled")) {
    return "L'inscription par email est momentanément indisponible. Réessayez plus tard.";
  }
  return "Inscription impossible. Vérifiez vos informations ou connectez-vous.";
}

function rateLimitedResponse(result: { ok: false; retryAfterSec: number }): NextResponse {
  return NextResponse.json(
    {
      error:
        result.retryAfterSec > 3600
          ? "Trop de tentatives. Compte temporairement verrouillé, réessayez plus tard."
          : "Trop de tentatives. Réessayez dans quelques minutes.",
    },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

/**
 * Étape « best-effort » bornée dans le temps. Les étapes post-inscription
 * (confirmation email, filet profil, session immédiate, rattachement des devis)
 * ne doivent JAMAIS bloquer la réponse : si un appel réseau (Supabase) traîne
 * au-delà de `ms`, on l'abandonne et on continue. Sans cette borne, un appel
 * lent faisait dépasser le délai nginx (60 s) → 502 Bad Gateway à l'inscription.
 */
async function bestEffort<T>(
  label: string,
  run: () => PromiseLike<T>,
  ms = 8000
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
      }),
    ]);
  } catch (err) {
    console.warn(`[auth] ${label} ignoré:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ── Inscription ────────────────────────────────────────────────── */

export async function registerAction(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRegisterRateLimit(ip);
  if (!limit.ok) return rateLimitedResponse(limit);

  try {
    const body = await request.json();
    const { email, password, name, phone, role } = body;
    const supabase = await getSupabaseServerClient();

    const parsed = registerSchema.safeParse({
      email,
      name,
      password,
      phone,
      role,
    });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Champs requis manquants";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    // Politique de complexité configurée (B-01)
    const policy = await validatePasswordPolicy(parsed.data.password);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.message }, { status: 400 });
    }

    const selectedRole = parsed.data.role;
    const parts = parsed.data.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";

    // Création du compte Supabase Auth (le profil est créé par le trigger
    // on_auth_user_created à partir de user_metadata).
    const signUpResult = await bestEffort(
      "Création du compte (signUp)",
      () =>
        supabase.auth.signUp({
          email: parsed.data.email.trim(),
          password: parsed.data.password,
          options: {
            data: {
              role: selectedRole,
              firstName,
              lastName,
              phone: parsed.data.phone || null,
            },
          },
        }),
      20000
    );
    if (!signUpResult) {
      // signUp a dépassé le délai (service Auth momentanément lent) : on renvoie
      // une erreur propre au lieu de laisser la requête pendre (→ 502 nginx).
      return NextResponse.json(
        { error: "Le service d'inscription est momentanément indisponible. Réessayez dans un instant." },
        { status: 503 }
      );
    }
    const { data: authData, error: signUpError } = signUpResult;

    if (signUpError) {
      // Le détail est journalisé côté serveur ; le message renvoyé est traduit
      // pour les cas connus (email existant, mot de passe faible…) sans
      // impacter l'anti-énumération des flux login/forgot.
      console.error("[auth] Erreur signUp:", {
        code: signUpError.code,
        status: signUpError.status,
        message: signUpError.message,
      });
      return NextResponse.json(
        { error: signUpErrorMessage(signUpError) },
        { status: 400 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Erreur lors de la création du compte" }, { status: 500 });
    }

    // Choix produit conservé : confirmation email automatique + connexion
    // immédiate pour tous les rôles (y compris USER).
    await bestEffort("Confirmation email auto", () =>
      db.auth.admin.updateUserById(userId, { email_confirm: true })
    );

    // Filet de sécurité : le profil est normalement créé par le trigger
    // on_auth_user_created. Si ce trigger est absent ou échoue côté base, on
    // crée le profil ici via la service_role (idempotent). Sans profil, la
    // connexion serait ensuite refusée (« Aucun profil associé à ce compte »).
    await bestEffort("Filet de création de profil", () =>
      db.from("profiles").upsert(
        {
          id: userId,
          email: parsed.data.email.trim().toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          phone: parsed.data.phone || null,
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
    );

    // Établit la session (cookie httpOnly) : connexion immédiate après l'inscription.
    await bestEffort("Session immédiate", () =>
      supabase.auth.signInWithPassword({
        email: parsed.data.email.trim(),
        password: parsed.data.password,
      })
    );

    // NOTE (C-02) : plus de création automatique de compagnie / insurer_accounts
    // à l'inscription. Un assureur doit être activé et lié à une compagnie par
    // un administrateur avant d'accéder à son espace.

    logAudit({
      action: "REGISTER",
      entity: "User",
      entityId: userId,
      details: { email: parsed.data.email.trim(), role: selectedRole },
    });

    // D : rattache les devis anonymes créés avec cet email (best-effort, borné).
    await bestEffort("Rattachement des devis anonymes", () =>
      reconcileAnonymousQuotes(userId, parsed.data.email.trim())
    );

    // Le rôle réel en base est TOUJOURS "USER" (le trigger handle_new_user force
    // ce rôle ; un assureur doit ensuite être activé par un admin). On renvoie
    // donc "USER" et non le rôle demandé, sinon la session cliente et la
    // redirection seraient incohérentes (accès à un espace non encore autorisé).
    return NextResponse.json({
      user: {
        id: userId,
        email: parsed.data.email.trim(),
        name: [firstName, lastName].filter(Boolean).join(" "),
        role: "USER",
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}

/* ── Connexion ──────────────────────────────────────────────────── */

export async function loginAction(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { email, password } = body;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Email et mot de passe requis";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    // Anti brute-force par IP + email (C-05)
    const limit = checkLoginRateLimit(ip, normalizedEmail);
    if (!limit.ok) return rateLimitedResponse(limit);

    const supabase = await getSupabaseServerClient();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: parsed.data.password,
    });

    if (signInError || !authData.user) {
      // Message générique : pas d'énumération d'emails.
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    // Vérifier que le compte est actif
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role, is_active, first_name, last_name")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[auth] Erreur de lecture du profil:", profileError);
    }

    if (!profile) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Aucun profil associé à ce compte. Contactez le support." },
        { status: 403 }
      );
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Compte désactivé. Contactez le support." }, { status: 403 });
    }

    // D : rattache les devis anonymes créés avec cet email (best-effort, borné).
    await bestEffort("Rattachement des devis anonymes", () =>
      reconcileAnonymousQuotes(authData.user.id, normalizedEmail)
    );

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: normalizedEmail,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" "),
        role: profile.role,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}

/* ── Déconnexion ────────────────────────────────────────────────── */

export async function logoutAction(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ message: "Déconnecté" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Erreur lors de la déconnexion" }, { status: 500 });
  }
}

/* ── Mot de passe oublié ────────────────────────────────────────── */

export async function forgotAction(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { email } = body;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }

    // Anti-spam email (C-05)
    const limit = checkForgotRateLimit(ip, parsed.data.trim().toLowerCase());
    if (!limit.ok) return rateLimitedResponse(limit);

    const supabase = await getSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.trim(), {
      redirectTo: `${resolveSiteUrl(request)}/mot-de-passe-oublie`,
    });

    // Réponse identique qu'il existe un compte ou non (pas d'énumération).
    return NextResponse.json({
      message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}

/* ── Réinitialisation du mot de passe (étape 2, via le lien email) ── */

/**
 * Échange le token de récupération contenu dans le lien de l'email
 * (type=recovery) et fixe le nouveau mot de passe.
 *
 * Le token est extrait du hash d'URL par le client puis transmis ici.
 * On établit la session via setSession (le compte n'a pas encore de
 * session active) avant d'appeler updateUser. La session de récupération
 * est ensuite fermée pour forcer une connexion explicite.
 */
export async function resetPasswordAction(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { accessToken, refreshToken, password } = body;

    if (!accessToken || !refreshToken || typeof accessToken !== "string" || typeof refreshToken !== "string") {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide ou expiré. Refaites une demande." },
        { status: 400 }
      );
    }

    const limit = checkResetPasswordLimit(ip);
    if (!limit.ok) return rateLimitedResponse(limit);

    const policy = await validatePasswordPolicy(password);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.message }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      return NextResponse.json(
        { error: "Lien de réinitialisation invalide ou expiré. Refaites une demande." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      return NextResponse.json({ error: "La réinitialisation a échoué. Réessayez." }, { status: 400 });
    }

    // Ferme la session de récupération : l'utilisateur se reconnectera
    // explicitement avec son nouveau mot de passe.
    await supabase.auth.signOut();

    logAudit({ action: "PASSWORD_RESET", entity: "User" });

    return NextResponse.json({ message: "Votre mot de passe a été réinitialisé." });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}

/* ── Session courante ───────────────────────────────────────────── */

export async function meAction() {
  try {
    const profile = await getSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        role: profile.role,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 500 });
  }
}
