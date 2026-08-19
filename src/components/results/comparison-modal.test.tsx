import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ComparisonModal } from "./comparison-modal";
import type { InsurerOffer } from "@/types";

/**
 * Régression : la fenêtre « Comparer » plantait à l'ouverture parce que
 * <TooltipTrigger asChild> recevait deux enfants (prix + bloc « Capital »),
 * ce que @radix-ui/react-slot refuse (Slot exige un enfant unique). Toute la
 * page /resultats basculait alors sur l'ErrorBoundary global.
 * Ce test rend le composant avec 2+ offres et vérifie qu'il n'explose pas.
 */
function makeOffer(over: Partial<InsurerOffer>): InsurerOffer {
  return {
    id: "o1",
    insurerId: "i1",
    insurerName: "SAHAM",
    insurerLogo: null,
    insurerRating: 4,
    name: "Économique",
    coverageType: "TIERS_SIMPLE",
    description: null,
    monthlyPrice: 10563,
    annualPrice: 126750,
    contractDuration: 12,
    deductible: 25000,
    maxCoverage: 5_000_000,
    features: ["Responsabilité civile"],
    conditions: null,
    guaranteeDescriptions: { "Responsabilité civile": "Couvre les dommages aux tiers." },
    pricingBreakdown: [
      {
        guaranteeName: "Responsabilité civile",
        guaranteeCode: "RC",
        categoryCode: "RESPONSABILITE_CIVILE",
        categoryName: "Responsabilité civile",
        amount: 45000,
        coverageCapital: 10_000_000,
        method: "TARIF",
        breakdown: "RC de base",
      },
    ],
    ...over,
  };
}

afterEach(() => cleanup());

describe("ComparisonModal", () => {
  it("s'ouvre avec 2 offres sans lever d'exception (régression Radix Slot)", () => {
    const offers = [
      makeOffer({ id: "a", insurerName: "SAHAM" }),
      makeOffer({ id: "b", insurerName: "NSIA", annualPrice: 140000, monthlyPrice: 11667 }),
    ];
    expect(() =>
      render(<ComparisonModal offers={offers} open onClose={() => {}} />)
    ).not.toThrow();
  });

  it("tolère des offres aux données partielles (features/coverageType/guaranteeName manquants)", () => {
    // On simule une ligne DB dégradée (champs manquants) via un cast :
    // features/coverageType/guaranteeName absents ne doivent pas planter.
    const degraded = {
      ...makeOffer({ id: "b" }),
      features: undefined,
      coverageType: undefined,
      pricingBreakdown: [
        { guaranteeCode: "X", categoryCode: "VOL", amount: 0, method: "TARIF", breakdown: "" },
      ],
    } as unknown as InsurerOffer;
    const offers: InsurerOffer[] = [makeOffer({ id: "a" }), degraded];
    expect(() =>
      render(<ComparisonModal offers={offers} open onClose={() => {}} />)
    ).not.toThrow();
  });
});
