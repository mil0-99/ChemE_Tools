/* tools/properties.js — Physical Property Database & Calculator
 *
 * A curated database of common process fluids with their key constants, plus
 * temperature-dependent vapor pressure (Antoine), reduced properties and
 * ideal-gas density. Not exhaustive — covers fluids seen across most CPI work.
 *
 * Data: Poling, Prausnitz & O'Connell, "The Properties of Gases and Liquids"
 *       (5th ed.); Perry's Chemical Engineers' Handbook; NIST.
 * Antoine form: log10(P[mmHg]) = A − B / (C + T[°C]); ranges are approximate.
 */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const Rgas = 8.314462; // J/(mol·K)

  // name: { MW g/mol, Tc K, Pc bar, omega, NBP K, rhoL kg/m3 @ rhoT °C (null if gas),
  //         antoine {A,B,C, Tmin, Tmax °C} | null }
  const DB = {
    "Water":            { MW: 18.015, Tc: 647.1, Pc: 220.6, omega: 0.345, NBP: 373.15, rhoL: 997, rhoT: 25, antoine: { A: 8.07131, B: 1730.63, C: 233.426, Tmin: 1, Tmax: 100 } },
    "Air":              { MW: 28.96,  Tc: 132.5, Pc: 37.7,  omega: 0.000, NBP: 78.8,  rhoL: null, rhoT: null, antoine: null },
    "Nitrogen":         { MW: 28.013, Tc: 126.2, Pc: 33.9,  omega: 0.039, NBP: 77.4,  rhoL: 807,  rhoT: -196, antoine: null },
    "Oxygen":           { MW: 31.999, Tc: 154.6, Pc: 50.4,  omega: 0.022, NBP: 90.2,  rhoL: 1141, rhoT: -183, antoine: null },
    "Carbon dioxide":   { MW: 44.010, Tc: 304.1, Pc: 73.8,  omega: 0.239, NBP: 194.7, rhoL: null, rhoT: null, antoine: null },
    "Hydrogen":         { MW: 2.016,  Tc: 33.2,  Pc: 13.0,  omega: -0.216, NBP: 20.4, rhoL: 71,   rhoT: -253, antoine: null },
    "Carbon monoxide":  { MW: 28.010, Tc: 132.9, Pc: 35.0,  omega: 0.066, NBP: 81.7,  rhoL: null, rhoT: null, antoine: null },
    "Hydrogen sulfide": { MW: 34.082, Tc: 373.5, Pc: 89.6,  omega: 0.094, NBP: 212.8, rhoL: null, rhoT: null, antoine: null },
    "Ammonia":          { MW: 17.031, Tc: 405.5, Pc: 113.5, omega: 0.250, NBP: 239.8, rhoL: 682,  rhoT: -33,  antoine: { A: 7.36050, B: 926.132, C: 240.17, Tmin: -83, Tmax: 60 } },
    "Methane":          { MW: 16.043, Tc: 190.6, Pc: 46.0,  omega: 0.011, NBP: 111.7, rhoL: 422,  rhoT: -162, antoine: null },
    "Ethane":           { MW: 30.070, Tc: 305.3, Pc: 48.7,  omega: 0.099, NBP: 184.6, rhoL: 544,  rhoT: -89,  antoine: null },
    "Propane":          { MW: 44.097, Tc: 369.8, Pc: 42.5,  omega: 0.152, NBP: 231.0, rhoL: 582,  rhoT: -42,  antoine: { A: 6.80398, B: 803.81, C: 246.99, Tmin: -108, Tmax: 27 } },
    "n-Butane":         { MW: 58.123, Tc: 425.1, Pc: 38.0,  omega: 0.200, NBP: 272.7, rhoL: 573,  rhoT: 25,   antoine: { A: 6.80896, B: 935.86, C: 238.73, Tmin: -78, Tmax: 19 } },
    "Ethylene":         { MW: 28.054, Tc: 282.3, Pc: 50.4,  omega: 0.087, NBP: 169.4, rhoL: null, rhoT: null, antoine: null },
    "Propylene":        { MW: 42.081, Tc: 365.0, Pc: 46.0,  omega: 0.142, NBP: 225.5, rhoL: null, rhoT: null, antoine: null },
    "Methanol":         { MW: 32.042, Tc: 512.6, Pc: 80.9,  omega: 0.566, NBP: 337.7, rhoL: 792,  rhoT: 25,   antoine: { A: 7.89750, B: 1474.08, C: 229.13, Tmin: -16, Tmax: 91 } },
    "Ethanol":          { MW: 46.069, Tc: 514.0, Pc: 61.4,  omega: 0.644, NBP: 351.4, rhoL: 789,  rhoT: 25,   antoine: { A: 8.04494, B: 1554.3, C: 222.65, Tmin: -2, Tmax: 100 } },
    "Acetone":          { MW: 58.080, Tc: 508.1, Pc: 47.0,  omega: 0.307, NBP: 329.2, rhoL: 784,  rhoT: 25,   antoine: { A: 7.11714, B: 1210.595, C: 229.664, Tmin: -13, Tmax: 55 } },
    "Benzene":          { MW: 78.114, Tc: 562.0, Pc: 48.9,  omega: 0.210, NBP: 353.2, rhoL: 874,  rhoT: 25,   antoine: { A: 6.90565, B: 1211.033, C: 220.790, Tmin: 8, Tmax: 103 } },
    "Toluene":          { MW: 92.141, Tc: 591.8, Pc: 41.1,  omega: 0.264, NBP: 383.8, rhoL: 865,  rhoT: 25,   antoine: { A: 6.95464, B: 1344.80, C: 219.482, Tmin: 6, Tmax: 137 } },
    "n-Pentane":        { MW: 72.150, Tc: 469.7, Pc: 33.7,  omega: 0.251, NBP: 309.2, rhoL: 621,  rhoT: 25,   antoine: { A: 6.85221, B: 1064.63, C: 232.000, Tmin: -50, Tmax: 58 } },
    "n-Hexane":         { MW: 86.177, Tc: 507.6, Pc: 30.2,  omega: 0.301, NBP: 341.9, rhoL: 655,  rhoT: 25,   antoine: { A: 6.87601, B: 1171.17, C: 224.41, Tmin: -25, Tmax: 92 } },
  };

  function antoineP_mmHg(a, T_C) { return Math.pow(10, a.A - a.B / (a.C + T_C)); }

  PET.registerTool({
    id: "properties",
    name: "Physical Property Database",
    category: "Properties",
    blurb: "Key constants for common process fluids (MW, Tc, Pc, ω, NBP), plus vapor pressure from the Antoine equation, reduced properties and ideal-gas density at your conditions.",
    inputs: [
      { key: "sub", label: "Substance", type: "select", options: () => Object.keys(DB), default: "Water" },
      { key: "T", label: "Temperature", type: "number", dim: "temperature", default: 25, defaultUnit: "°C" },
      { key: "P", label: "Pressure (for ρ and Pr)", type: "number", dim: "pressure", default: 101.325, defaultUnit: "kPa" },
    ],
    compute: (v) => {
      const d = DB[v.sub];
      const T = v.T;                 // K
      const P = v.P;                 // Pa
      const T_C = T - 273.15;
      const Pc_Pa = d.Pc * 1e5;
      const Tr = T / d.Tc;
      const Pr = P / Pc_Pa;
      const Rspec = Rgas / (d.MW / 1000);          // J/(kg·K)
      const rhoIdeal = (P * (d.MW / 1000)) / (Rgas * T); // kg/m3

      const outputs = [
        { label: "Molecular weight", value: (d.MW / 1000), dim: "molarmass", preferUnit: "g/mol" },
        { label: "Specific gas constant R/M", value: Rspec, unit: "J/(kg·K)", fixedUnit: true },
        { label: "Normal boiling point", value: d.NBP, dim: "temperature", preferUnit: "°C" },
        { label: "Critical temperature", value: d.Tc, dim: "temperature", preferUnit: "°C" },
        { label: "Critical pressure", value: Pc_Pa, dim: "pressure", preferUnit: "bar" },
        { label: "Acentric factor ω", value: d.omega, unit: "—", fixedUnit: true },
        { label: "Reduced temperature Tr", value: Tr, unit: "—", fixedUnit: true },
        { label: "Reduced pressure Pr", value: Pr, unit: "—", fixedUnit: true },
        { label: "Ideal-gas density at T, P", value: rhoIdeal, dim: "density", preferUnit: "kg/m3" },
      ];
      if (d.rhoL) outputs.push({ label: "Liquid density (reference)", value: d.rhoL, dim: "density", preferUnit: "kg/m3", hint: `at ${d.rhoT} °C, 1 atm` });

      const checks = [];
      const supercritical = T >= d.Tc;
      let Pvap = null;
      if (d.antoine && !supercritical) {
        Pvap = antoineP_mmHg(d.antoine, T_C) * 133.322368; // mmHg -> Pa
        outputs.splice(8, 0, { label: "Vapor pressure at T (Antoine)", value: Pvap, dim: "pressure", preferUnit: "kPa" });
        const inRange = T_C >= d.antoine.Tmin && T_C <= d.antoine.Tmax;
        checks.push({
          label: "Antoine validity",
          status: inRange ? "ok" : "warn",
          detail: inRange
            ? `T = ${PET.fmt(T_C)} °C is within the Antoine range (${d.antoine.Tmin}–${d.antoine.Tmax} °C).`
            : `T = ${PET.fmt(T_C)} °C is outside the fitted range (${d.antoine.Tmin}–${d.antoine.Tmax} °C); vapor pressure is extrapolated.`,
          ref: "Antoine equation; constants from Poling/Perry's",
        });
        if (P > 0) checks.push({
          label: "Phase indicator (ideal)",
          status: "ok",
          detail: P > Pvap
            ? `Operating P (${PET.fmt(P / 1000)} kPa) > Pvap (${PET.fmt(Pvap / 1000)} kPa): liquid / subcooled at this T.`
            : `Operating P (${PET.fmt(P / 1000)} kPa) ≤ Pvap (${PET.fmt(Pvap / 1000)} kPa): vapor / superheated at this T.`,
          ref: "Pure-component vapor-pressure comparison",
        });
      } else {
        checks.push({
          label: supercritical ? "Supercritical" : "Vapor pressure",
          status: "warn",
          detail: supercritical
            ? `T = ${PET.fmt(T_C)} °C is above the critical temperature (${PET.fmt(d.Tc - 273.15)} °C) — no distinct vapor pressure; the fluid is supercritical.`
            : "No Antoine data stored for this fluid in this build, so vapor pressure is not reported.",
          ref: "",
        });
      }
      if (Tr > 1) checks.push({
        label: "Reduced-property note", status: "ok",
        detail: `Tr = ${PET.fmt(Tr)} (> 1): above critical temperature. Ideal-gas density shown; use a real-gas EOS (e.g. Peng-Robinson) near/above the critical point.`,
        ref: "",
      });

      return {
        outputs, checks,
        notes: [
          "Constants are pure-component reference values; ideal-gas density ignores compressibility (apply Z for real gases).",
          "Database is a curated subset — extend the DB object in js/tools/properties.js to add fluids.",
        ],
        refs: ["Poling, Prausnitz & O'Connell — The Properties of Gases and Liquids (5th ed.)", "Perry's Chemical Engineers' Handbook", "NIST Chemistry WebBook"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
