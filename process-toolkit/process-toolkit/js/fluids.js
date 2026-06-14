/* fluids.js — shared fluid-mechanics helpers (SI units throughout). */
(function (global) {
  const PET = global.PET || (global.PET = {});

  const g = 9.80665; // m/s^2

  /** Reynolds number for pipe flow. v [m/s], D [m], rho [kg/m3], mu [Pa·s]. */
  function reynolds(rho, v, D, mu) {
    return (rho * v * D) / mu;
  }

  /** Darcy friction factor via the Churchill (1977) correlation — a single
   *  explicit expression valid across laminar, transition and turbulent flow.
   *  eps [m] is absolute roughness, D [m] diameter. */
  function churchillF(Re, eps, D) {
    if (Re <= 0) return 0;
    const A = Math.pow(2.457 * Math.log(1 / (Math.pow(7 / Re, 0.9) + 0.27 * (eps / D))), 16);
    const B = Math.pow(37530 / Re, 16);
    return 8 * Math.pow(Math.pow(8 / Re, 12) + 1 / Math.pow(A + B, 1.5), 1 / 12);
  }

  /** Velocity from volumetric flow Q [m3/s] in a pipe of inside diameter D [m]. */
  function velocity(Q, D) {
    const area = (Math.PI / 4) * D * D;
    return Q / area;
  }

  /* Typical absolute pipe roughness, metres. (Crane TP-410 / Moody) */
  const ROUGHNESS = {
    "Commercial steel": 4.6e-5,
    "Stainless steel (clean)": 1.5e-5,
    "Galvanized iron": 1.5e-4,
    "Cast iron": 2.6e-4,
    "Concrete": 1.2e-3,
    "Drawn tubing (copper/glass)": 1.5e-6,
    "PVC / plastic": 1.5e-6,
  };

  PET.fluids = { g, reynolds, churchillF, velocity, ROUGHNESS };
  if (typeof module !== "undefined" && module.exports) module.exports = PET.fluids;
})(typeof window !== "undefined" ? window : globalThis);
