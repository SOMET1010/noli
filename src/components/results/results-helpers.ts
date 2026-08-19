import { resolveCoverageName } from "@/lib/constants";
import type { InsurerOffer, PricingBreakdown } from "@/types";

/** Normalise un nom de garantie (accents, casse, séparateurs) pour comparaison. */
export function normalizeGuaranteeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "et")
    .replace(/[-_]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Retrouve la ligne de tarification correspondant à une garantie. */
export function findPricingForFeature(
  pricingBreakdown: InsurerOffer["pricingBreakdown"],
  feature: string
) {
  if (!pricingBreakdown) return undefined;
  const norm = normalizeGuaranteeName(feature);

  // 1) Correspondance exacte (nom ou code résolu) : prioritaire, elle lève les
  //    ambiguïtés entre garanties aux libellés proches (ex. les variantes IPT).
  const exact = pricingBreakdown.find((pb) => {
    if (normalizeGuaranteeName(pb.guaranteeName) === norm) return true;
    if (normalizeGuaranteeName(pb.guaranteeCode) === norm) return true;
    if (normalizeGuaranteeName(resolveCoverageName(pb.guaranteeName)) === norm) return true;
    return false;
  });
  if (exact) return exact;

  // 2) Correspondance partielle : on garde le meilleur candidat (écart de
  //    longueur minimal), pas le premier trouvé. Un libellé strictement plus
  //    long que la feature est pénalisé (feature générique → variante).
  const keywords = norm.split(" ").filter((w) => w.length > 2);
  let best: PricingBreakdown | undefined;
  let bestScore = Infinity;
  for (const pb of pricingBreakdown) {
    const normName = normalizeGuaranteeName(pb.guaranteeName);
    if (!normName) continue;
    const resolvedName = normalizeGuaranteeName(resolveCoverageName(pb.guaranteeName));
    const matches =
      norm.includes(normName) ||
      normName.includes(norm) ||
      norm.includes(resolvedName) ||
      resolvedName.includes(norm) ||
      (keywords.length > 0 && keywords.every((kw) => normName.includes(kw)));
    if (!matches) continue;
    const penalty = normName.includes(norm) ? 500 : 0;
    const score = penalty + Math.abs(normName.length - norm.length);
    if (score < bestScore) {
      bestScore = score;
      best = pb;
    }
  }
  return best;
}

/** Style de badge selon le type de couverture. */
export const coverageBadgeStyle = (type: string) => {
  switch (type) {
    case "Tiers":
      return "bg-muted/60 text-muted-foreground border-border";
    case "Tiers+":
      return "bg-secondary/15 text-secondary border-secondary/25";
    case "Tous Risques":
      return "bg-accent/20 text-accent-foreground border-accent/35";
    case "Premium":
      return "bg-primary/15 text-primary border-primary/30";
    case "Premium+":
      return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-400/40";
    default:
      return "bg-muted/60 text-muted-foreground border-border";
  }
};
