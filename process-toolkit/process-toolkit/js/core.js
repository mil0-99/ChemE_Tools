/* core.js — shared namespace, tool registry, formatting helpers.
 * Loaded first. Uses a UMD-lite pattern so calc helpers also work under Node
 * for the test suite. */
(function (global) {
  const PET = global.PET || {};
  PET.tools = PET.tools || [];
  PET.calc = PET.calc || {};

  /** Register a tool definition for the UI to render. */
  PET.registerTool = function (def) {
    PET.tools.push(def);
    if (def.id && def.compute) PET.calc[def.id] = def.compute;
  };

  /* ---- number formatting (engineering-friendly, tabular) ---- */
  PET.fmt = function (x, sig) {
    sig = sig || 4;
    if (x === null || x === undefined || Number.isNaN(x)) return "—";
    if (!isFinite(x)) return "∞";
    const ax = Math.abs(x);
    if (ax !== 0 && (ax < 1e-3 || ax >= 1e6)) return x.toExponential(sig - 1);
    // round to significant figures, then trim
    const rounded = Number(x.toPrecision(sig));
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
  };

  PET.round = function (x, dp) {
    const f = Math.pow(10, dp || 0);
    return Math.round(x * f) / f;
  };

  global.PET = PET;
  if (typeof module !== "undefined" && module.exports) module.exports = PET;
})(typeof window !== "undefined" ? window : globalThis);
