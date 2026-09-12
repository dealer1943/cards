/**
 * Shared vertical layout for the playing surface.
 * Felt top and resting card centers must stay in sync so cards never clip under the mesh.
 */

/** Must match CardMesh box thickness (Y). */
export const CARD_THICKNESS = 0.028;

/**
 * World Y of the top of the green felt pad (playable surface).
 * Felt extrude depth is 0.09 with mesh.position.y = FELT_SURFACE_Y - 0.09.
 */
export const FELT_SURFACE_Y = 0.06;

/** Tiny clearance so card bottoms sit clearly on the felt, not z-fighting. */
const SURFACE_CLEARANCE = 0.003;

/**
 * World Y for resting / dealt card mesh centers on the felt.
 * Accounts for half card thickness + clearance above FELT_SURFACE_Y.
 */
export const TABLE_SURFACE_Y =
  FELT_SURFACE_Y + CARD_THICKNESS * 0.5 + SURFACE_CLEARANCE;
