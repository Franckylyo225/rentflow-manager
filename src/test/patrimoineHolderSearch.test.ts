import { describe, it, expect } from "vitest";
import { assetMatchesSearch, holderMatchesSearch } from "@/lib/patrimoineSearch";

const ASSET = {
  title: "Terrain Bingerville",
  locality: "Bingerville",
  subdivision_name: "Lotissement les Paillotes",
  land_title: "TF-4521/2019",
  handling_firm: "Cabinet Konan",
  description: "",
  receipt_order_number: "",
  block_number: "C",
  plot_number: "12",
  holder_id: "h1",
  asset_holders: { full_name: "Kouassi Kouadio" },
};

const HOLDERS = [
  { id: "h1", full_name: "Kouassi Kouadio" },
  { id: "h2", full_name: "Aïcha Diallo" },
];

describe("recherche patrimoine par titulaire", () => {
  it("trouve un actif à partir du nom du titulaire", () => {
    expect(assetMatchesSearch(ASSET, "kouassi", HOLDERS)).toBe(true);
  });

  it("ignore les accents et la casse", () => {
    expect(assetMatchesSearch(ASSET, "KOUASSI", HOLDERS)).toBe(true);
    const aicha = { ...ASSET, holder_id: "h2", asset_holders: { full_name: "Aïcha Diallo" } };
    expect(assetMatchesSearch(aicha, "aicha diallo", HOLDERS)).toBe(true);
  });

  it("combine titulaire et localité sur deux mots", () => {
    expect(assetMatchesSearch(ASSET, "kouassi bingerville", HOLDERS)).toBe(true);
    expect(assetMatchesSearch(ASSET, "kouassi yopougon", HOLDERS)).toBe(false);
  });

  it("trouve aussi par titre, lotissement, titre foncier, îlot et lot", () => {
    expect(assetMatchesSearch(ASSET, "paillotes", HOLDERS)).toBe(true);
    expect(assetMatchesSearch(ASSET, "TF-4521", HOLDERS)).toBe(true);
    expect(assetMatchesSearch(ASSET, "ilot c lot 12", HOLDERS)).toBe(true);
  });

  it("un mot inexclu ne correspond à rien", () => {
    expect(assetMatchesSearch(ASSET, "titulaire inconnu", HOLDERS)).toBe(false);
  });

  it("une recherche vide laisse passer tous les actifs", () => {
    expect(assetMatchesSearch(ASSET, "", HOLDERS)).toBe(true);
    expect(assetMatchesSearch(ASSET, "   ", HOLDERS)).toBe(true);
  });

  it("utilise le titulaire joint quand la liste n'est pas encore chargée", () => {
    expect(assetMatchesSearch(ASSET, "kouadio")).toBe(true);
  });

  it("ne fait pas correspondre un actif sans titulaire", () => {
    const orphan = { ...ASSET, holder_id: null, asset_holders: null };
    expect(assetMatchesSearch(orphan, "kouassi", HOLDERS)).toBe(false);
    expect(assetMatchesSearch(orphan, "bingerville", HOLDERS)).toBe(true);
  });

  it("recherche les titulaires eux-aussi sans accents", () => {
    expect(holderMatchesSearch({ full_name: "Aïcha Diallo", phone: "07000000" }, "aicha")).toBe(true);
    expect(holderMatchesSearch({ full_name: "Aïcha Diallo", phone: "0745881212" }, "0745")).toBe(true);
    expect(holderMatchesSearch({ full_name: "Aïcha Diallo" }, "kouassi")).toBe(false);
  });
});
