/* tools/two-phase.js — Two-Phase Line Sizing (homogeneous ρv² method) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  PET.registerTool({
    id: "two-phase-line",
    name: "Two-Phase Line Sizing",
    category: "Hydraulics",
    blurb: "Size a gas/liquid line with the homogeneous ρv² criterion and API RP 14E erosional limit, selecting a real ASME pipe. Estimation-grade screening for two-phase lines.",
    inputs: [
      { key: "W", label: "Total mass flow", type: "number", dim: "massflow", default: 5, defaultUnit: "kg/s" },
      { key: "x", label: "Vapor mass fraction (quality, 0–1)", type: "number", default: 0.3 },
      { key: "rhoL", label: "Liquid density", type: "number", dim: "density", default: 800, defaultUnit: "kg/m3" },
      { key: "rhoG", label: "Vapor density", type: "number", dim: "density", default: 12, defaultUnit: "kg/m3" },
      { key: "sched", label: "Pipe schedule", type: "select", options: () => ["40", "80"], default: "40" },
      { key: "limit", label: "ρv² limit", type: "number", dim: "pressure", default: 10, defaultUnit: "kPa", help: "Common screening limits: ~10 kPa (10000 Pa) continuous; lower for carbon-steel/erosive service (Norsok/EI)." },
      { key: "margin", label: "Design margin on flow (%)", type: "number", default: 10 },
    ],
    compute: (v) => {
      const x = Math.min(Math.max(v.x, 0), 1);
      const W = v.W * (1 + v.margin / 100);
      // homogeneous (no-slip) mixture density
      const rhoM = 1 / (x / v.rhoG + (1 - x) / v.rhoL);
      const limit = v.limit; // Pa (== kg/(m·s²))
      // ρv² = W²/(ρm·A²) ≤ limit  →  A ≥ W / sqrt(ρm·limit)
      const Areq = W / Math.sqrt(rhoM * limit);
      const Dreq = Math.sqrt((4 * Areq) / Math.PI);
      const pipe = PET.standards.selectPipe(Dreq, Number(v.sched));
      const A = (Math.PI / 4) * pipe.id_m * pipe.id_m;
      const vel = (W / rhoM) / A;               // mixture velocity, m/s
      const rhoV2 = rhoM * vel * vel;            // Pa
      const rho_lbft3 = rhoM / 16.0184634;
      const Ve = (100 / Math.sqrt(rho_lbft3)) * 0.3048; // API 14E, m/s

      const checks = [
        {
          label: "ρv² vs screening limit",
          status: rhoV2 <= limit ? "ok" : "warn",
          detail: `Actual ρv² = ${PET.fmt(rhoV2)} Pa vs limit ${PET.fmt(limit)} Pa (homogeneous mixture density ${PET.fmt(rhoM)} kg/m³).`,
          ref: "Norsok P-001 / Energy Institute; API RP 14E basis",
        },
        {
          label: "API RP 14E erosional velocity",
          status: vel <= Ve ? "ok" : "fail",
          detail: `Mixture velocity ${PET.fmt(vel)} m/s vs erosional ${PET.fmt(Ve)} m/s (C=100, mixture density).`,
          ref: "API RP 14E",
        },
      ];
      if (pipe.oversize) checks.push({ label: "Size range", status: "warn", detail: "Required diameter exceeds the largest tabulated size (24\"). Split into multiple lines.", ref: "" });

      return {
        outputs: [
          { label: "Mixture density (homogeneous)", value: rhoM, dim: "density", preferUnit: "kg/m3" },
          { label: "Required inside diameter", value: Dreq, dim: "length", preferUnit: "mm" },
          { label: "Recommended pipe", value: pipe.nps, unit: `NPS (in), Sch ${v.sched}`, fixedUnit: true },
          { label: "Actual inside diameter", value: pipe.id_m, dim: "length", preferUnit: "mm" },
          { label: "Mixture velocity", value: vel, dim: "velocity", preferUnit: "m/s" },
          { label: "Actual ρv²", value: rhoV2, dim: "pressure", preferUnit: "kPa" },
          { label: "Erosional velocity (API 14E)", value: Ve, dim: "velocity", preferUnit: "m/s" },
        ],
        checks,
        notes: [
          "Homogeneous no-slip model: ρm = 1 / (x/ρ_g + (1−x)/ρ_l). Good for screening; use a rigorous two-phase method (Beggs-Brill, OLGA) for detailed design and slug/flow-regime work.",
          `Design flow includes a ${v.margin}% margin.`,
        ],
        refs: ["API RP 14E (erosional velocity)", "Norsok P-001 / Energy Institute (ρv² limits)", "ASME B36.10M"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
