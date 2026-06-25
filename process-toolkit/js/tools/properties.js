/* tools/properties.js — Physical Property Database & Calculator
 *
 * Component data lives in js/components.js (PET.components).
 * Fields used here: MW [g/mol], Tc [K], Pc [Pa], w (acentric factor),
 *   Tb [NBP °C], A/B/C [Antoine], Tmin/Tmax [Antoine range °C],
 *   rhoL [kg/m³ liquid ref], rhoT [°C ref temp].
 *
 * Sources: Poling, Prausnitz & O'Connell — The Properties of Gases and
 *   Liquids (5th ed.); Perry's Chemical Engineers' Handbook; NIST.
 * Antoine form: log10(P[mmHg]) = A − B / (C + T[°C])
 */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const Rgas = 8.314462; // J/(mol·K)

  // Compound names available once components.js has loaded.
  // Air is excluded from VLE tools — include it here but flag it.
  function db() { return PET.components || {}; }

  function antoineP_mmHg(d, T_C) {
    return Math.pow(10, d.A - d.B / (d.C + T_C));
  }

  PET.registerTool({
    id: "properties",
    name: "Physical Property Database",
    category: "Properties",
    blurb: "Key constants for common process fluids (MW, Tc, Pc, ω, NBP), vapor pressure from the Antoine equation, reduced properties and ideal-gas density.",
    inputs: [
      { key: "sub", label: "Substance", type: "select",
        options: () => Object.keys(db()).sort(), default: "Water" },
      { key: "T", label: "Temperature", type: "number",
        dim: "temperature", default: 25, defaultUnit: "°C" },
      { key: "P", label: "Pressure (for ρ and Pr)", type: "number",
        dim: "pressure", default: 101.325, defaultUnit: "kPa" },
    ],
    compute: (v) => {
      const d = db()[v.sub];
      if (!d) throw new Error("Unknown substance — reload the page.");
      const T     = v.T;          // K (toBase converts °C → K)
      const P     = v.P;          // Pa
      const T_C   = T - 273.15;
      const Pc_Pa = d.Pc;         // already Pa
      const Tr    = T / d.Tc;
      const Pr    = P / Pc_Pa;
      const Rspec = Rgas / (d.MW / 1000);               // J/(kg·K)
      const rhoIdeal = (P * (d.MW / 1000)) / (Rgas * T); // kg/m³

      const outputs = [
        { label: "Molecular weight",            value: d.MW / 1000,  dim: "molarmass",    preferUnit: "g/mol" },
        { label: "Specific gas constant R/M",   value: Rspec,        unit: "J/(kg·K)",    fixedUnit: true },
        { label: "Normal boiling point",        value: d.Tb + 273.15, dim: "temperature", preferUnit: "°C" },
        { label: "Critical temperature",        value: d.Tc,          dim: "temperature", preferUnit: "°C" },
        { label: "Critical pressure",           value: Pc_Pa,         dim: "pressure",    preferUnit: "bar" },
        { label: "Acentric factor ω",           value: d.w,           unit: "—",          fixedUnit: true },
        { label: "Reduced temperature Tr",      value: Tr,            unit: "—",          fixedUnit: true },
        { label: "Reduced pressure Pr",         value: Pr,            unit: "—",          fixedUnit: true },
        { label: "Ideal-gas density at T, P",   value: rhoIdeal,      dim: "density",     preferUnit: "kg/m3" },
      ];
      if (d.rhoL) {
        outputs.push({
          label: "Liquid density (reference)", value: d.rhoL, dim: "density",
          preferUnit: "kg/m3", hint: `at ${d.rhoT} °C, 1 atm`,
        });
      }

      const checks = [];
      const supercritical = T >= d.Tc;
      let Pvap = null;

      if (d.A !== null && !supercritical) {
        Pvap = antoineP_mmHg(d, T_C) * 133.322368; // mmHg → Pa
        outputs.splice(8, 0, {
          label: "Vapor pressure at T (Antoine)", value: Pvap,
          dim: "pressure", preferUnit: "kPa",
        });

        if (d.Tmin !== null) {
          const inRange = T_C >= d.Tmin && T_C <= d.Tmax;
          checks.push({
            label: "Antoine validity",
            status: inRange ? "ok" : "warn",
            detail: inRange
              ? `T = ${PET.fmt(T_C)} °C is within the fitted range (${d.Tmin}–${d.Tmax} °C).`
              : `T = ${PET.fmt(T_C)} °C is outside the fitted range (${d.Tmin}–${d.Tmax} °C); vapor pressure is extrapolated.`,
            ref: "Antoine equation; constants from Poling/Perry's/NIST",
          });
        }

        if (P > 0) {
          checks.push({
            label: "Phase indicator (ideal)",
            status: "ok",
            detail: P > Pvap
              ? `Operating P (${PET.fmt(P / 1000)} kPa) > Pvap (${PET.fmt(Pvap / 1000)} kPa): liquid / subcooled at this T.`
              : `Operating P (${PET.fmt(P / 1000)} kPa) ≤ Pvap (${PET.fmt(Pvap / 1000)} kPa): vapor / superheated at this T.`,
            ref: "Pure-component vapor-pressure comparison",
          });
        }
      } else if (d.A === null) {
        checks.push({
          label: "Vapor pressure",
          status: "warn",
          detail: d.sub === "Air"
            ? "Air is a mixture; no single vapor pressure applies."
            : "No Antoine data stored for this compound; vapor pressure not reported.",
          ref: "",
        });
      } else {
        checks.push({
          label: "Supercritical",
          status: "warn",
          detail: `T = ${PET.fmt(T_C)} °C is above the critical temperature (${PET.fmt(d.Tc - 273.15)} °C) — no distinct vapor pressure.`,
          ref: "",
        });
      }

      if (Tr > 1) {
        checks.push({
          label: "Reduced-property note", status: "ok",
          detail: `Tr = ${PET.fmt(Tr)} (> 1): above critical temperature. Use a real-gas EOS (e.g. Peng-Robinson) near/above the critical point.`,
          ref: "",
        });
      }

      return {
        outputs, checks,
        notes: [
          "Ideal-gas density ignores compressibility (apply Z-factor for real gases near critical conditions).",
          "Database contains 49 components — see js/components.js to add more.",
        ],
        refs: [
          "Poling, Prausnitz & O'Connell — The Properties of Gases and Liquids (5th ed.)",
          "Perry's Chemical Engineers' Handbook",
          "NIST Chemistry WebBook",
        ],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
