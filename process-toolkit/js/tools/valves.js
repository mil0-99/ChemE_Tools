/* tools/valves.js — Control Valve Sizing (IEC 60534) + PSV Sizing (API 520) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  /* ====================== CONTROL VALVE SIZING ====================== */
  PET.registerTool({
    id: "control-valve",
    name: "Control Valve Sizing",
    category: "Valves & Relief",
    blurb: "Required Cv for liquid or gas/vapor service (IEC 60534), with choked-flow check and a target % travel so the valve operates in its controllable band.",
    inputs: [
      { key: "phase", label: "Service", type: "select", options: () => ["Liquid", "Gas / vapor"], default: "Liquid" },
      { key: "Qv", label: "Liquid flow", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h", showIf: { key: "phase", eq: "Liquid" } },
      { key: "SG", label: "Liquid specific gravity", type: "number", default: 1.0, showIf: { key: "phase", eq: "Liquid" } },
      { key: "Pv", label: "Vapor pressure (abs)", type: "number", dim: "pressure", default: 3, defaultUnit: "kPa", showIf: { key: "phase", eq: "Liquid" } },
      { key: "Pc", label: "Fluid critical pressure (abs)", type: "number", dim: "pressure", default: 22064, defaultUnit: "kPa", showIf: { key: "phase", eq: "Liquid" } },
      { key: "Qg", label: "Gas flow (standard)", type: "number", dim: "volflow", default: 1000, defaultUnit: "m3/h", showIf: { key: "phase", eq: "Gas / vapor" } },
      { key: "MW", label: "Molecular weight", type: "number", default: 18, showIf: { key: "phase", eq: "Gas / vapor" } },
      { key: "T", label: "Inlet temperature", type: "number", dim: "temperature", default: 25, defaultUnit: "°C", showIf: { key: "phase", eq: "Gas / vapor" } },
      { key: "Z", label: "Compressibility Z", type: "number", default: 1.0, showIf: { key: "phase", eq: "Gas / vapor" } },
      { key: "P1", label: "Inlet pressure (abs)", type: "number", dim: "pressure", default: 600, defaultUnit: "kPa" },
      { key: "P2", label: "Outlet pressure (abs)", type: "number", dim: "pressure", default: 400, defaultUnit: "kPa" },
      { key: "FL", label: "Liquid pressure-recovery factor FL", type: "number", default: 0.9 },
      { key: "targetTravel", label: "Target valve travel at this flow (%)", type: "number", default: 70 },
    ],
    compute: (v) => {
      const P1 = v.P1, P2 = v.P2, dP = P1 - P2;
      const checks = [];
      let Cv, notes = [];

      if (v.phase === "Liquid") {
        // IEC 60534-2-1 liquid: FF and choked dP
        const FF = 0.96 - 0.28 * Math.sqrt(v.Pv / v.Pc);
        const dPchoked = v.FL * v.FL * (P1 - FF * v.Pv); // Pa
        const choked = dP >= dPchoked;
        const dPeff = choked ? dPchoked : dP;            // Pa
        // Cv (US): Q[gpm] = Cv*sqrt(dP[psi]/SG)  ->  Cv = Q*sqrt(SG/dP)
        const Qgpm = v.Qv / 6.30901964e-5; // m3/s -> US gpm
        const dPpsi = dPeff / 6894.757293;
        Cv = Qgpm * Math.sqrt(v.SG / dPpsi);
        checks.push({
          label: "Choked / flashing flow", status: choked ? "warn" : "ok",
          detail: choked ? `Flow is choked: ΔP (${PET.fmt(dP / 1000)} kPa) ≥ choked ΔP (${PET.fmt(dPchoked / 1000)} kPa). Cv based on choked ΔP; check for cavitation/flashing.`
            : `Not choked (choked ΔP = ${PET.fmt(dPchoked / 1000)} kPa).`,
          ref: "IEC 60534-2-1 (FF, FL)",
        });
      } else {
        // gas, US units simplified: x = dP/P1, xT default 0.7, Y expansion
        const x = dP / P1, xT = 0.7;
        const xeff = Math.min(x, xT);
        const Y = 1 - xeff / (3 * xT);
        const choked = x >= xT;
        const Tabs = v.T; // K (already SI)
        const Tr = Tabs * 9 / 5; // °R
        const Qscfh = (v.Qg / 0.0283168466) * 3600; // m3/h std -> ft3/h std
        const P1psia = P1 / 6894.757293;
        const Gg = v.MW / 28.96; // gas specific gravity
        // ISA gas eq (US): Cv = Q / (1360 * P1 * Y * sqrt(x/(Gg*T*Z)))  [Q scfh, P1 psia, T °R]
        Cv = Qscfh / (1360 * P1psia * Y * Math.sqrt(xeff / (Gg * Tr * v.Z)));
        checks.push({
          label: "Choked (critical) flow", status: choked ? "warn" : "ok",
          detail: choked ? `Pressure ratio x (${PET.fmt(x)}) ≥ xT (${xT}): flow is choked; Cv uses xT.`
            : `Subcritical (x = ${PET.fmt(x)} < xT = ${xT}).`,
          ref: "IEC 60534-2-1; ISA gas sizing",
        });
      }

      const Cvrated = Cv / (v.targetTravel / 100);
      checks.push({
        label: "Controllable travel band", status: v.targetTravel >= 20 && v.targetTravel <= 80 ? "ok" : "warn",
        detail: `Sizing for ${v.targetTravel}% travel. Control valves should normally run 20–80% open for good rangeability and control.`,
        ref: "Fisher Control Valve Handbook (5th ed.)",
      });

      return {
        outputs: [
          { label: "Required Cv (at this flow)", value: Cv, unit: "Cv", fixedUnit: true },
          { label: "Recommended rated Cv", value: Cvrated, unit: "Cv", fixedUnit: true, hint: `so this flow ≈ ${v.targetTravel}% travel` },
          { label: "Pressure drop", value: dP, dim: "pressure", preferUnit: "kPa" },
        ],
        checks, notes,
        refs: ["IEC 60534-2-1 / ISA 75.01", "Fisher Control Valve Handbook"],
      };
    },
  });

  /* ========================= PSV SIZING (API 520) ========================= */
  PET.registerTool({
    id: "psv-sizing",
    name: "PSV / Relief Valve Sizing",
    category: "Valves & Relief",
    blurb: "Required orifice area for gas/vapor (critical & subcritical) or liquid relief per API 520, then selects the next API 526 standard orifice letter.",
    inputs: [
      { key: "svc", label: "Relief service", type: "select", options: () => ["Vapor / gas", "Liquid"], default: "Vapor / gas" },
      { key: "W", label: "Required relief rate", type: "number", dim: "massflow", default: 5000, defaultUnit: "kg/h", showIf: { key: "svc", eq: "Vapor / gas" } },
      { key: "Ql", label: "Required relief rate (liquid)", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h", showIf: { key: "svc", eq: "Liquid" } },
      { key: "T", label: "Relieving temperature", type: "number", dim: "temperature", default: 100, defaultUnit: "°C", showIf: { key: "svc", eq: "Vapor / gas" } },
      { key: "MW", label: "Molecular weight", type: "number", default: 18, showIf: { key: "svc", eq: "Vapor / gas" } },
      { key: "k", label: "Cp/Cv (k)", type: "number", default: 1.3, showIf: { key: "svc", eq: "Vapor / gas" } },
      { key: "Z", label: "Compressibility Z", type: "number", default: 1.0, showIf: { key: "svc", eq: "Vapor / gas" } },
      { key: "SG", label: "Liquid specific gravity", type: "number", default: 1.0, showIf: { key: "svc", eq: "Liquid" } },
      { key: "P1", label: "Relieving pressure (set × (1+overpr.) + atm, abs)", type: "number", dim: "pressure", default: 1100, defaultUnit: "kPa" },
      { key: "Pb", label: "Back pressure (abs)", type: "number", dim: "pressure", default: 101.325, defaultUnit: "kPa", showIf: { key: "svc", eq: "Liquid" } },
      { key: "Kd", label: "Discharge coefficient Kd", type: "number", default: 0.975 },
      { key: "Kb", label: "Back-pressure correction Kb", type: "number", default: 1.0 },
      { key: "Kc", label: "Combination (rupture disc) Kc", type: "number", default: 1.0 },
    ],
    compute: (v) => {
      const checks = [];
      let A_m2, notes = [];
      const P1kPa = v.P1; // SI Pa actually — careful: SI base is Pa
      const P1 = v.P1;    // Pa (abs)

      if (v.svc === "Vapor / gas") {
        // API 520 critical-flow vapor, SI form:
        // A[mm2] = (W[kg/h] / (C·Kd·P1[kPaa]·Kb·Kc)) · sqrt(T[K]·Z / M)
        const k = v.k;
        const C = 0.03948 * Math.sqrt(k * Math.pow(2 / (k + 1), (k + 1) / (k - 1))); // SI coeff
        const Wkgh = v.W * 3600; // kg/s -> kg/h
        const P1kPaa = P1 / 1000;
        const A_mm2 = (Wkgh / (C * v.Kd * P1kPaa * v.Kb * v.Kc)) * Math.sqrt((v.T * v.Z) / v.MW);
        A_m2 = A_mm2 * 1e-6;
        notes.push("Critical (sonic) flow assumed; coefficient C from k via API 520 Eq.");
      } else {
        // API 520 liquid (no viscosity/visc correction, Kw=1):
        // A[mm2] = (11.78·Q[m3/h]/(Kd·Kw·Kc·Kv)) · sqrt(SG/(1.25·Pset - Pb))... use general:
        // Q[L/min] = ... use US-derived SI: A[mm2] = (Q[L/min]/(38.02·Kd·Kw·Kc·Kv))·sqrt(G/(P1-Pb)[kPa])
        const Qlmin = v.Ql / 60 * 1000; // m3/h -> L/min
        const dPkPa = (P1 - v.Pb) / 1000;
        const A_mm2 = (Qlmin / (38.02 * v.Kd * 1.0 * v.Kc * 1.0)) * Math.sqrt(v.SG / dPkPa);
        A_m2 = A_mm2 * 1e-6;
        notes.push("Liquid sizing with Kw=Kv=1 (no back-pressure/viscosity correction). Verify Kv for viscous service.");
      }

      const orifice = PET.standards.selectOrifice(A_m2);
      checks.push({
        label: "Standard orifice selection",
        status: orifice.oversize ? "warn" : "ok",
        detail: orifice.oversize ? "Required area exceeds the largest API 526 orifice (T). Use multiple valves or a special design."
          : `Selected API 526 orifice "${orifice.letter}" (${orifice.area_in2} in²) ≥ required ${PET.fmt(A_m2 / 6.4516e-4)} in².`,
        ref: "API 526 (standard orifice areas)",
      });

      return {
        outputs: [
          { label: "Required orifice area", value: A_m2, dim: "area", preferUnit: "mm2" },
          { label: "Selected API orifice", value: orifice.letter, unit: "letter", fixedUnit: true },
          { label: "Orifice area (selected)", value: orifice.area_m2, dim: "area", preferUnit: "mm2" },
        ],
        checks, notes,
        refs: ["API 520 Part I (sizing)", "API 526 (orifice designations)"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
