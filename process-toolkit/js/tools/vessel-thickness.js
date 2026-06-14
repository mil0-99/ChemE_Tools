/* tools/vessel-thickness.js — Pressure Vessel Wall Thickness (ASME VIII Div 1) */
(function (global) {
  const PET = global.PET || (global.PET = {});
  // gauge-style pressure units (scale only, no atmospheric offset) for design pressure & stress
  const PUNITS = ["kPa", "bar", "MPa", "psi", "kgf/cm2"];

  PET.registerTool({
    id: "vessel-thickness",
    name: "Vessel Wall Thickness",
    category: "Mechanical",
    blurb: "Minimum wall thickness for internal pressure (ASME BPVC Section VIII Div 1: UG-27 shells, UG-32 heads), with corrosion allowance and a back-calculated MAWP.",
    inputs: [
      { key: "comp", label: "Component", type: "select", options: () => ["Cylindrical shell", "2:1 Ellipsoidal head", "Hemispherical head", "Torispherical head (F&D)"], default: "Cylindrical shell" },
      { key: "P", label: "Design pressure (internal, gauge)", type: "number", dim: "pressure", units: PUNITS, default: 1000, defaultUnit: "kPa" },
      { key: "D", label: "Inside diameter", type: "number", dim: "length", default: 1500, defaultUnit: "mm" },
      { key: "S", label: "Allowable stress S (at temperature)", type: "number", dim: "pressure", units: PUNITS, default: 138, defaultUnit: "MPa", help: "e.g. SA-516-70 ≈ 138 MPa up to ~345 °C — confirm from ASME II-D for your material/temperature." },
      { key: "E", label: "Joint efficiency E", type: "number", default: 1.0, help: "1.0 full RT · 0.85 spot RT · 0.70 no RT (typical)." },
      { key: "CA", label: "Corrosion allowance", type: "number", dim: "length", default: 3, defaultUnit: "mm" },
    ],
    compute: (v) => {
      const P = v.P, S = v.S, E = v.E, R = v.D / 2;
      let t, formula;
      switch (v.comp) {
        case "Cylindrical shell": // UG-27(c)(1), circumferential (longitudinal joint)
          t = (P * R) / (S * E - 0.6 * P); formula = "t = P·R / (S·E − 0.6·P)"; break;
        case "2:1 Ellipsoidal head": // UG-32(d)
          t = (P * v.D) / (2 * S * E - 0.2 * P); formula = "t = P·D / (2·S·E − 0.2·P)"; break;
        case "Hemispherical head": // UG-32(f)
          t = (P * R) / (2 * S * E - 0.2 * P); formula = "t = P·R / (2·S·E − 0.2·P)"; break;
        default: // standard torispherical (F&D), L≈D, knuckle r=0.06L → UG-32(e) simplified
          t = (0.885 * P * v.D) / (S * E - 0.1 * P); formula = "t = 0.885·P·L / (S·E − 0.1·P), L = D"; break;
      }
      const tTotal = t + v.CA;
      // MAWP back-calc at the computed (corroded-out) thickness, shell basis where applicable
      let mawp;
      if (v.comp === "Cylindrical shell") mawp = (S * E * t) / (R + 0.6 * t);
      else if (v.comp === "Hemispherical head") mawp = (2 * S * E * t) / (R + 0.2 * t);
      else if (v.comp === "2:1 Ellipsoidal head") mawp = (2 * S * E * t) / (v.D + 0.2 * t);
      else mawp = (S * E * t) / (0.885 * v.D + 0.1 * t);

      const thinOk = P <= 0.385 * S * E; // UG-27 thin-wall validity for shells
      const checks = [{
        label: "Thin-wall formula validity",
        status: thinOk ? "ok" : "fail",
        detail: thinOk
          ? `P ≤ 0.385·S·E (${PET.fmt(0.385 * S * E / 1000)} kPa). UG-27/UG-32 thin-wall formulas apply.`
          : `P exceeds 0.385·S·E — wall is thick; use the Div 1 Appendix 1-2 thick-wall equations or Div 2.`,
        ref: "ASME VIII Div 1, UG-27 / Appendix 1",
      }, {
        label: "Joint efficiency", status: E >= 0.7 && E <= 1.0 ? "ok" : "warn",
        detail: `E = ${PET.fmt(E)}. Use the value matching your radiography level and joint type (UW-12).`,
        ref: "ASME VIII Div 1, UW-12",
      }];

      return {
        outputs: [
          { label: "Required thickness (no CA)", value: t, dim: "length", preferUnit: "mm", hint: formula },
          { label: "Required thickness + CA", value: tTotal, dim: "length", preferUnit: "mm" },
          { label: "MAWP at required thickness", value: mawp, dim: "pressure", units: PUNITS, preferUnit: "kPa" },
        ],
        checks,
        notes: [
          "Internal-pressure minimum wall only. Add mill tolerance and check external pressure, nozzle reinforcement, wind/seismic and other loads per the Code.",
          "Allowable stress S is material- and temperature-dependent — take it from ASME BPVC Section II, Part D.",
        ],
        refs: ["ASME BPVC Section VIII Division 1 (UG-27, UG-32, UW-12)", "ASME BPVC Section II Part D (allowable stress)"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
