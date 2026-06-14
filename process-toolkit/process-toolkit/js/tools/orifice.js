/* tools/orifice.js — Orifice Plate / Flow-meter Sizing (ISO 5167) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  PET.registerTool({
    id: "orifice-sizing",
    name: "Orifice / Flow-meter Sizing",
    category: "Hydraulics",
    blurb: "Size a square-edged orifice bore for a target differential pressure, or compute flow from a known bore and ΔP (ISO 5167). Reports β ratio and permanent pressure loss.",
    inputs: [
      { key: "mode", label: "Mode", type: "select", options: () => ["Size bore for target ΔP", "Flow from bore & ΔP"], default: "Size bore for target ΔP" },
      { key: "basis", label: "Flow basis", type: "select", options: () => ["Volumetric", "Mass"], default: "Volumetric", showIf: { key: "mode", eq: "Size bore for target ΔP" } },
      { key: "Qv", label: "Volumetric flow (design)", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h", showIf: { key: "basis", eq: "Volumetric" } },
      { key: "Qm", label: "Mass flow (design)", type: "number", dim: "massflow", default: 10, defaultUnit: "kg/s", showIf: { key: "basis", eq: "Mass" } },
      { key: "rho", label: "Fluid density", type: "number", dim: "density", default: 1000, defaultUnit: "kg/m3" },
      { key: "D", label: "Pipe inside diameter", type: "number", dim: "length", default: 100, defaultUnit: "mm" },
      { key: "dP", label: "Differential pressure", type: "number", dim: "pressure", default: 25, defaultUnit: "kPa" },
      { key: "d", label: "Orifice bore", type: "number", dim: "length", default: 60, defaultUnit: "mm", showIf: { key: "mode", eq: "Flow from bore & ΔP" } },
      { key: "Cd", label: "Discharge coefficient Cd", type: "number", default: 0.61 },
      { key: "eps", label: "Expansibility ε (1 for liquids)", type: "number", default: 1 },
    ],
    compute: (v) => {
      const D = v.D, A_pipe = (Math.PI / 4) * D * D;
      const checks = [], notes = [], outputs = [];
      const permLossFrac = (beta) => 1 - Math.pow(beta, 1.9); // approx square-edged orifice

      if (v.mode === "Size bore for target ΔP") {
        const qm = v.basis === "Volumetric" ? v.Qv * v.rho : v.Qm; // kg/s
        // qm = Cd/sqrt(1-β⁴)·ε·(π/4)·d²·sqrt(2·ΔP·ρ)  →  solve d (iterate on β⁴ term)
        const K = qm / (v.eps * (Math.PI / 4) * Math.sqrt(2 * v.dP * v.rho)); // = Cd·d²/sqrt(1-β⁴)
        let beta = 0.5, d = beta * D;
        for (let i = 0; i < 50; i++) {
          const d2 = (K * Math.sqrt(1 - Math.pow(beta, 4))) / v.Cd;
          d = Math.sqrt(Math.max(d2, 0));
          const nb = d / D;
          if (Math.abs(nb - beta) < 1e-8) { beta = nb; break; }
          beta = nb;
          if (beta >= 1) { beta = 0.99; break; }
        }
        const vel = (qm / v.rho) / A_pipe;
        const perm = permLossFrac(beta) * v.dP;
        checks.push({
          label: "Beta ratio validity", status: beta >= 0.2 && beta <= 0.75 ? "ok" : "warn",
          detail: `β = d/D = ${PET.fmt(beta)}. ISO 5167-2 is valid for β ≈ 0.2–0.75; outside this, accuracy degrades.`,
          ref: "ISO 5167-2",
        });
        outputs.push(
          { label: "Required orifice bore", value: d, dim: "length", preferUnit: "mm" },
          { label: "Beta ratio (d/D)", value: beta, unit: "—", fixedUnit: true },
          { label: "Pipe velocity", value: vel, dim: "velocity", preferUnit: "m/s" },
          { label: "Permanent pressure loss", value: perm, dim: "pressure", preferUnit: "kPa", hint: "≈ (1 − β^1.9)·ΔP" },
        );
      } else {
        const beta = v.d / D;
        const d = v.d;
        const qm = (v.Cd / Math.sqrt(1 - Math.pow(beta, 4))) * v.eps * (Math.PI / 4) * d * d * Math.sqrt(2 * v.dP * v.rho);
        const Qv = qm / v.rho;
        const vel = Qv / A_pipe;
        const perm = permLossFrac(beta) * v.dP;
        checks.push({
          label: "Beta ratio validity", status: beta >= 0.2 && beta <= 0.75 ? "ok" : "warn",
          detail: `β = ${PET.fmt(beta)} (valid range ≈ 0.2–0.75 per ISO 5167-2).`, ref: "ISO 5167-2",
        });
        outputs.push(
          { label: "Mass flow", value: qm, dim: "massflow", preferUnit: "kg/h" },
          { label: "Volumetric flow", value: Qv, dim: "volflow", preferUnit: "m3/h" },
          { label: "Beta ratio (d/D)", value: beta, unit: "—", fixedUnit: true },
          { label: "Pipe velocity", value: vel, dim: "velocity", preferUnit: "m/s" },
          { label: "Permanent pressure loss", value: perm, dim: "pressure", preferUnit: "kPa" },
        );
      }
      notes.push("Cd ≈ 0.60–0.61 for square-edged concentric orifices (flange/D-D/2 taps); refine with the Reader-Harris/Gallagher equation for the final design.");
      notes.push("For compressible (gas) service set ε < 1 from the ISO 5167 expansibility relation; ε = 1 is exact for liquids.");
      return { outputs, checks, notes, refs: ["ISO 5167-1/-2 (orifice plates)", "Reader-Harris/Gallagher (Cd)"] };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
