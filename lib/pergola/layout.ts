import { PROFILE } from "./catalog";
import type { Dimensions, Layout, Part } from "./types";

/**
 * Pure function: turns the parametric dimensions into a list of rectangular
 * parts in metres. The 3D renderer, the material calculator and a future
 * AR/GLB exporter all consume this same description.
 *
 * Style: modern "grid" pergola. Square posts stand on the deck, a perimeter
 * frame of beams sits flush with the post tops, black steel brackets wrap the
 * corners and the post feet, and shade slats sit inside the frame.
 *
 * Coordinate system: X = width, Z = length, Y = up. Origin at ground level,
 * centred under the deck.
 */
export function buildLayout(dims: Dimensions): Layout {
  const W = dims.width / 100;
  const L = dims.length / 100;
  const H = dims.height / 100; // deck surface -> top of frame

  const { board, joist, rafter, beam, post, bracket } = PROFILE;
  const parts: Part[] = [];

  // --- Substructure: joists run along Z, spaced along X --------------------
  const joistCount = Math.floor(W / joist.spacing) + 1;
  const joistPitch = joistCount > 1 ? (W - joist.width) / (joistCount - 1) : 0;
  for (let i = 0; i < joistCount; i++) {
    const x = -W / 2 + joist.width / 2 + i * joistPitch;
    parts.push({
      group: "joist",
      center: [x, joist.height / 2, 0],
      length: L,
      height: joist.height,
      width: joist.width,
      axis: "z",
    });
  }

  // --- Decking boards run along X, rows spaced along Z ----------------------
  const deckTop = joist.height + board.thickness;
  const rows = Math.max(1, Math.round(L / (board.width + board.gap)));
  const rowPitch = rows > 1 ? (L - board.width) / (rows - 1) : 0;
  for (let i = 0; i < rows; i++) {
    const z = -L / 2 + board.width / 2 + i * rowPitch;
    parts.push({
      group: "decking",
      center: [0, joist.height + board.thickness / 2, z],
      length: W,
      height: board.thickness,
      width: board.width,
      axis: "x",
    });
  }

  // --- Posts: stand on the deck, run the full height to the frame top ------
  const postX = W / 2 - post.size / 2 - post.inset;
  const postZ = L / 2 - post.size / 2 - post.inset;
  const frameTop = deckTop + H;
  const postLength = H;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push({
        group: "post",
        center: [sx * postX, deckTop + postLength / 2, sz * postZ],
        length: postLength,
        height: post.size,
        width: post.size,
        axis: "y",
      });
    }
  }

  // --- Perimeter beams, flush with the post tops ----------------------------
  const beamY = frameTop - beam.height / 2;
  const sideBeamLength = 2 * postZ; // post centre to post centre, ends hidden in posts
  const endBeamLength = 2 * postX;
  for (const s of [-1, 1]) {
    parts.push({
      group: "beam",
      center: [s * postX, beamY, 0],
      length: sideBeamLength,
      height: beam.height,
      width: beam.width,
      axis: "z",
    });
    parts.push({
      group: "beam",
      center: [0, beamY, s * postZ],
      length: endBeamLength,
      height: beam.height,
      width: beam.width,
      axis: "x",
    });
  }

  // --- Shade slats across the frame, running along X ----------------------
  const rafterLength = 2 * postX - beam.width; // between the inner faces of the side beams
  const rafterSpan = 2 * postZ - beam.width - rafter.width - 0.05;
  const rafterCount = Math.max(2, Math.round(rafterSpan / rafter.spacing) + 1);
  const rafterPitch = rafterSpan / (rafterCount - 1);
  const rafterY = frameTop - rafter.drop - rafter.height / 2;
  for (let i = 0; i < rafterCount; i++) {
    const z = -rafterSpan / 2 + i * rafterPitch;
    parts.push({
      group: "rafter",
      center: [0, rafterY, z],
      length: rafterLength,
      height: rafter.height,
      width: rafter.width,
      axis: "x",
    });
  }

  // --- Black steel hardware ------------------------------------------------
  const c = bracket.clearance;
  const capSize = post.size + 2 * c;
  const capHeight = beam.height + bracket.capDrop;
  const sleeveH = beam.height + c;
  const sleeveW = beam.width + 2 * c;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // Corner cap wrapping the post top.
      parts.push({
        group: "bracket",
        center: [sx * postX, frameTop + c / 2 - capHeight / 2, sz * postZ],
        length: capHeight,
        height: capSize,
        width: capSize,
        axis: "y",
      });
      // Sleeves along both beams leaving the corner.
      parts.push({
        group: "bracket",
        center: [sx * (postX - bracket.sleeveLength / 2), beamY + c / 2, sz * postZ],
        length: bracket.sleeveLength,
        height: sleeveH,
        width: sleeveW,
        axis: "x",
      });
      parts.push({
        group: "bracket",
        center: [sx * postX, beamY + c / 2, sz * (postZ - bracket.sleeveLength / 2)],
        length: bracket.sleeveLength,
        height: sleeveH,
        width: sleeveW,
        axis: "z",
      });
      // Base plate / shoe at the post foot.
      parts.push({
        group: "bracket",
        center: [sx * postX, deckTop + bracket.baseHeight / 2, sz * postZ],
        length: bracket.baseHeight,
        height: capSize,
        width: capSize,
        axis: "y",
      });
    }
  }

  return {
    parts,
    bounds: {
      min: [-W / 2, 0, -L / 2],
      max: [W / 2, frameTop, L / 2],
    },
    counts: {
      posts: 4,
      beams: 4,
      rafters: rafterCount,
      joists: joistCount,
      deckingRows: rows,
      cornerBrackets: 4,
      basePlates: 4,
    },
    lengths: {
      post: postLength,
      beam: (2 * sideBeamLength + 2 * endBeamLength) / 4,
      rafter: rafterLength,
      joist: L,
      deckingRow: W,
    },
  };
}
