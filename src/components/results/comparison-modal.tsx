"use client";

import React, { memo, useMemo } from "react";
import { Car, Check, Shield, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { formatFCFA, parseFCFA } from "@/lib/utils";
import { resolveCoverageName } from "@/lib/constants";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeGuaranteeName } from "./results-helpers";
import type { InsurerOffer } from "@/types";

const COVERAGE_LABELS: Record<string, string> = {
  RESPONSABILITE_CIVILE: "RC",
  DEFENSE_RECOURS: "Défense & Recours",
  INDIVIDUELLE_CONDUCTEUR: "Ind. Conducteur",
  INDIVIDUELLE_PASSAGERS: "Ind. Passagers",
  INCENDIE: "Incendie",
  VOL: "Vol",
  BRIS_GLACES: "Bris de Glaces",
  TIERCE_COMPLETE: "Tierce Complète",
  TIERCE_COLLISION: "Tierce Collision",
  ASSISTANCE: "Assistance",
  AVANCE_RECOURS: "Avance sur Recours",
  ACCESSOIRES: "Accessoires",
};

export interface ComparisonModalProps {
  offers: InsurerOffer[];
  open: boolean;
  onClose: () => void;
}

function ComparisonModalComponent({ offers, open, onClose }: ComparisonModalProps) {
  const { vehicleInfo } = useAppStore();
  const selectedCategories: string[] = []; // Catégories remplacées par le type de contrat

  // Build category → guarantees: selected categories ALWAYS appear
  const categories = useMemo(() => {
    const catMap = new Map<string, { name: string; guarantees: string[] }>()

    // 1) Seed ALL selected categories
    for (const code of selectedCategories) {
      catMap.set(code, {
        name: COVERAGE_LABELS[code] || code,
        guarantees: [],
      })
    }

    // 2) Collect ALL guarantee names from all offers' pricingBreakdown
    const allBreakdowns = new Map<
      string,
      { name: string; code: string; categoryName: string }[]
    >()
    for (const o of offers) {
      if (!o.pricingBreakdown) continue
      for (const pb of o.pricingBreakdown) {
        if (!pb.categoryCode || !pb.guaranteeName) continue
        const list = allBreakdowns.get(pb.categoryCode) || []
        if (!list.some(e => e.name === pb.guaranteeName)) {
          list.push({
            name: pb.guaranteeName,
            code: pb.guaranteeCode,
            categoryName: pb.categoryName || pb.guaranteeName,
          })
        }
        allBreakdowns.set(pb.categoryCode, list)
      }
    }

    // 3) Fill each selected category with its guarantees from breakdowns
    for (const [catCode, guarantees] of allBreakdowns) {
      if (catMap.has(catCode)) {
        const entry = catMap.get(catCode)!
        for (const g of guarantees) {
          if (!entry.guarantees.includes(g.name)) {
            entry.guarantees.push(g.name)
          }
        }
      }
    }

    // 4) For any selected category still empty, add the category name itself as a single guarantee
    for (const [, entry] of catMap) {
      if (entry.guarantees.length === 0) {
        entry.guarantees.push(entry.name)
      }
    }

    // 5) Add extra categories from breakdowns not in selectedCategories
    for (const [catCode, guarantees] of allBreakdowns) {
      if (!catMap.has(catCode)) {
        catMap.set(catCode, {
          name: guarantees[0]?.categoryName || catCode,
          guarantees: guarantees.map(g => g.name),
        })
      }
    }

    return Array.from(catMap.entries())
  }, [offers, selectedCategories])

  // Build a lookup: offer.id → normalized guarantee name keys
  const guaranteeLookup = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const o of offers) {
      const set = new Set<string>()
      if (o.pricingBreakdown) {
        for (const pb of o.pricingBreakdown) {
          if (pb.guaranteeName) {
            set.add(pb.guaranteeName)
            set.add(normalizeGuaranteeName(pb.guaranteeName))
            set.add(resolveCoverageName(pb.guaranteeName))
          }
          if (pb.guaranteeCode) {
            set.add(pb.guaranteeCode)
            set.add(normalizeGuaranteeName(pb.guaranteeCode))
          }
        }
      }
      for (const f of o.features || []) {
        set.add(f)
        set.add(normalizeGuaranteeName(f))
        set.add(resolveCoverageName(f))
      }
      map.set(o.id, set)
    }
    return map
  }, [offers])

  // Build a pricing lookup with normalized keys: `${offerId}::${normalizedGuaranteeName}` → PricingBreakdown
  const pricingLookup = useMemo(() => {
    const map = new Map<
      string,
      {
        amount: number
        coverageCapital?: number
        method: string
        breakdown: string
      }
    >()
    for (const o of offers) {
      if (o.pricingBreakdown) {
        for (const pb of o.pricingBreakdown) {
          const keys = [
            pb.guaranteeName,
            pb.guaranteeCode,
            resolveCoverageName(pb.guaranteeName),
          ]
            .filter(Boolean)
            .flatMap(name => [name, normalizeGuaranteeName(name)])
          for (const key of keys) {
            map.set(`${o.id}::${key}`, pb)
          }
        }
      }
    }
    return map
  }, [offers])

  if (!open || offers.length < 2) return null

  const cheapest = [...offers].sort(
    (a, b) => a.annualPrice - b.annualPrice
  )[0]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[1050px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/30 sticky top-0 z-20">
          <DialogTitle className="text-lg font-bold text-foreground">
            Comparer les garanties
          </DialogTitle>
          <DialogClose
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            asChild
          >
            <button type="button" aria-label="Fermer">
              <X className="size-4" />
            </button>
          </DialogClose>
          <DialogDescription className="sr-only">
            Comparaison détaillée de {offers.length} offres
            d&apos;assurance
          </DialogDescription>
        </div>

        {/* ── Récap du véhicule et garanties demandées ── */}
        <div className="px-6 py-4 border-b border-border/40 bg-primary/[0.03]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Car className="size-4 text-primary" />
              <span className="font-semibold text-foreground">
                Véhicule
              </span>
              <span className="text-muted-foreground">
                {vehicleInfo.year || "—"} ·{" "}
                {vehicleInfo.fiscalPower || "—"} CV ·{" "}
                {vehicleInfo.fuelType || "—"}
              </span>
            </div>
            {vehicleInfo.newValue && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  Valeur neuve :
                </span>
                <span className="font-semibold text-foreground">
                  {formatFCFA(parseFCFA(vehicleInfo.newValue))}
                </span>
              </div>
            )}
            {vehicleInfo.currentValue && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  Valeur actuelle :
                </span>
                <span className="font-semibold text-foreground">
                  {formatFCFA(
                    parseFCFA(vehicleInfo.currentValue)
                  )}
                </span>
              </div>
            )}
            {vehicleInfo.usage && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">
                  Usage :
                </span>
                <span className="font-medium text-foreground">
                  {vehicleInfo.usage}
                </span>
              </div>
            )}
          </div>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedCategories.map(code => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold border border-primary/20"
                >
                  <Check className="size-3" />
                  {COVERAGE_LABELS[code] || code}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full bg-muted/50 text-muted-foreground px-2.5 py-0.5 text-[11px] font-medium">
                {selectedCategories.length} garantie
                {selectedCategories.length > 1 ? "s" : ""}{" "}
                demandée
                {selectedCategories.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left p-4 w-52 bg-muted/30 sticky left-0 z-10 border-b border-border/60">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Critères
                  </span>
                </th>
                {offers.map(offer => {
                  const isBest = offer.id === cheapest.id
                  return (
                    <th
                      key={offer.id}
                      className={`text-center p-4 border-b border-border/60 min-w-[150px] ${isBest ? "bg-primary/[0.06]" : "bg-muted/30"}`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="relative">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${isBest ? "bg-primary/15 border-primary/40" : "bg-primary/10 border-primary/20"}`}
                          >
                            <Shield className="size-5 text-primary" />
                          </div>
                          {isBest && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-[9px] font-bold">
                              ★
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-foreground leading-tight">
                          {offer.insurerName}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {(offer.coverageType || "").replace(
                            "_",
                            " "
                          )}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {/* Prix mensuel */}
              <tr className="bg-card">
                <td className="p-4 text-sm font-semibold text-foreground sticky left-0 bg-card border-b border-border/30">
                  Mensuel
                </td>
                {offers.map(offer => (
                  <td
                    key={offer.id}
                    className={`p-4 text-center text-sm font-bold border-b border-border/30 ${offer.id === cheapest.id ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                  >
                    {formatFCFA(offer.monthlyPrice)}/mois
                  </td>
                ))}
              </tr>

              {/* Prix annuel */}
              <tr className="bg-muted/20">
                <td className="p-4 text-sm font-semibold text-foreground sticky left-0 bg-muted/20 border-b border-border/30">
                  Annuel
                </td>
                {offers.map(offer => (
                  <td
                    key={offer.id}
                    className={`p-4 text-center text-sm font-bold border-b border-border/30 ${offer.id === cheapest.id ? "text-green-600 dark:text-green-400" : "text-foreground"}`}
                  >
                    {formatFCFA(offer.annualPrice)}
                  </td>
                ))}
              </tr>

              {/* Franchise */}
              <tr className="bg-card">
                <td className="p-4 text-sm font-medium text-foreground sticky left-0 bg-card border-b border-border/30">
                  Franchise
                </td>
                {offers.map(offer => (
                  <td
                    key={offer.id}
                    className="p-4 text-center text-sm text-foreground border-b border-border/30"
                  >
                    {offer.deductible
                      ? formatFCFA(offer.deductible)
                      : "—"}
                  </td>
                ))}
              </tr>

              {/* Couverture max */}
              {offers.some(o => o.maxCoverage > 0) && (
                <tr className="bg-card">
                  <td className="p-4 text-sm font-medium text-foreground sticky left-0 bg-card border-b border-border/30">
                    Couverture max
                  </td>
                  {offers.map(offer => (
                    <td
                      key={offer.id}
                      className="p-4 text-center text-sm text-foreground border-b border-border/30"
                    >
                      {offer.maxCoverage > 0
                        ? `${Math.round(offer.maxCoverage / 1_000_000)}M FCFA`
                        : "—"}
                    </td>
                  ))}
                </tr>
              )}

              {/* Guarantee rows grouped by category */}
              {categories.map(([catKey, catData], catIdx) => (
                <React.Fragment key={catKey}>
                  <tr>
                    <td
                      className="p-0"
                      colSpan={offers.length + 1}
                    >
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-muted/60 via-muted/30 to-transparent border-b border-t border-border/30">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                          <Shield className="size-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {catData.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">
                          {catData.guarantees.length}{" "}
                          garanti
                          {catData.guarantees.length >
                          1
                            ? "es"
                            : "e"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {catData.guarantees.map(
                    (guarantee, idx) => {
                      const isZebra =
                        catIdx % 2 === 0
                          ? idx % 2 === 1
                          : idx % 2 === 0
                      return (
                        <tr
                          key={guarantee}
                          className={`transition-colors ${
                            isZebra
                              ? "bg-primary/5"
                              : "bg-card"
                          } hover:bg-muted/20`}
                        >
                          <td
                            className={`p-3 pl-6 text-sm text-foreground sticky left-0 border-b border-border/20 font-medium ${
                              isZebra
                                ? "bg-primary/5"
                                : "bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                              {guarantee}
                            </div>
                          </td>
                          {offers.map(offer => {
                            const normG =
                              normalizeGuaranteeName(
                                guarantee
                              )
                            const hasGuarantee =
                              (guaranteeLookup
                                .get(offer.id)
                                ?.has(
                                  guarantee
                                ) ??
                                false) ||
                              (guaranteeLookup
                                .get(offer.id)
                                ?.has(normG) ??
                                false)
                            const pricing =
                              pricingLookup.get(
                                `${offer.id}::${guarantee}`
                              ) ||
                              pricingLookup.get(
                                `${offer.id}::${normG}`
                              )
                            const description =
                              offer
                                .guaranteeDescriptions?.[
                                guarantee
                              ] ||
                              offer
                                .guaranteeDescriptions?.[
                                Object.keys(
                                  offer.guaranteeDescriptions ||
                                    {}
                                ).find(
                                  k =>
                                    normalizeGuaranteeName(
                                      k
                                    ) ===
                                    normG
                                ) || ""
                              ] ||
                              null
                            return (
                              <td
                                key={offer.id}
                                className="p-3 text-center border-b border-border/20"
                              >
                                <Tooltip>
                                  <TooltipTrigger
                                    asChild
                                  >
                                    <span className="inline-block cursor-default">
                                      <span
                                        className={`text-sm font-bold tabular-nums ${
                                          hasGuarantee
                                            ? pricing
                                              ? pricing.amount === 0
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-foreground"
                                              : "text-green-600 dark:text-green-400"
                                            : "text-muted-foreground/40"
                                        }`}
                                      >
                                        {hasGuarantee
                                          ? pricing
                                            ? pricing.amount === 0
                                              ? "Gratuit"
                                              : formatFCFA(
                                                  pricing.amount
                                                )
                                            : "✓"
                                          : "—"}
                                      </span>
                                      {hasGuarantee &&
                                        pricing &&
                                        pricing.coverageCapital !=
                                          null &&
                                        pricing.coverageCapital >
                                          0 && (
                                          <span className="block text-[10px] text-muted-foreground/70 mt-0.5 font-normal">
                                            Capital :{" "}
                                            {formatFCFA(
                                              pricing.coverageCapital
                                            )}
                                          </span>
                                        )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    className="max-w-[300px] text-sm bg-foreground text-background border-foreground"
                                    arrowClassName="fill-foreground bg-foreground"
                                  >
                                    <div className="space-y-1.5">
                                      <p className="font-bold text-background">
                                        {
                                          guarantee
                                        }
                                      </p>
                                      {hasGuarantee ? (
                                        <>
                                          {description ? (
                                            <p className="text-background/90 whitespace-pre-line leading-relaxed">
                                              {
                                                description
                                              }
                                            </p>
                                          ) : (
                                            <p className="text-background/60 italic">
                                              Description
                                              non
                                              disponible
                                            </p>
                                          )}
                                          {pricing && (
                                            <div className="border-t border-background/20 pt-1.5 mt-1.5 space-y-1">
                                              {pricing.coverageCapital !=
                                                null &&
                                                pricing.coverageCapital >
                                                  0 && (
                                                  <p className="text-background/90">
                                                    Capital
                                                    garanti :{" "}
                                                    <span className="font-bold text-background">
                                                      {formatFCFA(
                                                        pricing.coverageCapital
                                                      )}
                                                    </span>
                                                  </p>
                                                )}
                                              <p className="text-background/90">
                                                Montant :{" "}
                                                <span className="font-bold text-background">
                                                  {pricing.amount ===
                                                  0
                                                    ? "Gratuit"
                                                    : formatFCFA(
                                                        pricing.amount
                                                      )}
                                                </span>
                                              </p>
                                              <p className="text-background/90">
                                                Méthode :{" "}
                                                <span className="font-semibold text-background">
                                                  {
                                                    pricing.method
                                                  }
                                                </span>
                                              </p>
                                              {pricing.breakdown && (
                                                <p className="text-background/80 whitespace-pre-line text-xs">
                                                  {
                                                    pricing.breakdown
                                                  }
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-background/70 italic">
                                          Non
                                          couverte
                                          par
                                          cette
                                          offre
                                        </p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    }
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const ComparisonModal = memo(ComparisonModalComponent);
