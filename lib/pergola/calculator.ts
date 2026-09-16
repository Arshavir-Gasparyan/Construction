import { PRICES, PROFILE } from "./catalog";
import { buildLayout } from "./layout";
import type { MaterialId, PergolaConfig } from "./types";

export type BillLine = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  detail?: string;
  price: number;
};

export type Estimate = {
  areaM2: number;
  lines: BillLine[];
  total: number;
};

const round = (n: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

/**
 * Material take-off + price estimate derived from the same layout that is
 * rendered in 3D, so the numbers always match what the customer sees.
 */
export function calculateEstimate(config: PergolaConfig): Estimate {
  const layout = buildLayout(config);
  const { counts, lengths } = layout;
  const material: MaterialId = config.material;
  const rates = PRICES[material];
  const frame = PRICES.frame;

  const areaM2 = (config.width / 100) * (config.length / 100);

  const deckingMeters = counts.deckingRows * lengths.deckingRow;
  const deckingPieces =
    counts.deckingRows * Math.ceil(lengths.deckingRow / PROFILE.board.stockLength);

  const joistMeters = counts.joists * lengths.joist;
  const rafterMeters = counts.rafters * lengths.rafter;
  const beamMeters = counts.beams * lengths.beam;
  const postMeters = counts.posts * lengths.post;

  // One hidden clip per board/joist intersection, plus start clips per joist.
  const clips = counts.deckingRows * counts.joists + counts.joists * 2;
  // One screw per clip, plus structural fixings for the frame and hardware.
  const screws =
    clips +
    counts.rafters * 4 +
    counts.cornerBrackets * 12 +
    counts.basePlates * 8 +
    counts.joists * 4;

  const lines: BillLine[] = [
    {
      id: "decking",
      label: `Decking boards (${material === "wpc" ? "WPC" : "Larch"})`,
      quantity: deckingPieces,
      unit: "pcs",
      detail: `${counts.deckingRows} rows · ${round(deckingMeters)} lm · ${PROFILE.board.stockLength} m stock`,
      price: deckingMeters * rates.deckingPerMeter,
    },
    {
      id: "joists",
      label: "Joists (substructure)",
      quantity: counts.joists,
      unit: "pcs",
      detail: `${round(lengths.joist, 2)} m each · ${round(joistMeters)} lm`,
      price: joistMeters * rates.joistPerMeter,
    },
    {
      id: "posts",
      label: "Posts 150×150",
      quantity: counts.posts,
      unit: "pcs",
      detail: `${round(lengths.post, 2)} m each · ${round(postMeters)} lm`,
      price: postMeters * frame.postPerMeter,
    },
    {
      id: "beams",
      label: "Perimeter beams 140×150",
      quantity: counts.beams,
      unit: "pcs",
      detail: `${round(lengths.beam, 2)} m each · ${round(beamMeters)} lm`,
      price: beamMeters * frame.beamPerMeter,
    },
    {
      id: "rafters",
      label: "Shade slats 40×140",
      quantity: counts.rafters,
      unit: "pcs",
      detail: `${round(lengths.rafter, 2)} m each · ${round(rafterMeters)} lm`,
      price: rafterMeters * frame.rafterPerMeter,
    },
    {
      id: "corner-brackets",
      label: "Steel corner brackets",
      quantity: counts.cornerBrackets,
      unit: "pcs",
      detail: "Powder-coated black",
      price: counts.cornerBrackets * frame.cornerBracketEach,
    },
    {
      id: "base-plates",
      label: "Post base plates",
      quantity: counts.basePlates,
      unit: "pcs",
      detail: "Powder-coated black",
      price: counts.basePlates * frame.basePlateEach,
    },
    {
      id: "clips",
      label: "Hidden fastening clips",
      quantity: clips,
      unit: "pcs",
      price: clips * rates.clipEach,
    },
    {
      id: "screws",
      label: "Screws & fixings",
      quantity: screws,
      unit: "pcs",
      detail: `${Math.ceil(screws / 100)} packs of 100`,
      price: screws * frame.screwEach,
    },
  ];

  const total = lines.reduce((sum, l) => sum + l.price, 0);

  return {
    areaM2: round(areaM2, 2),
    lines: lines.map((l) => ({ ...l, price: Math.round(l.price) })),
    total: Math.round(total),
  };
}
