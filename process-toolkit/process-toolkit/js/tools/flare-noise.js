/* tools/flare-noise.js — Flare Stack Relief (API 521) + Noise screening (IEC 60534-8-3) */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const Rgas = 8314.462; // J/(kmol·K)

  /* ========================= FLARE STACK RELIEF ========================= */
  PET.registerTool({
    id: "flare-stack",
    name: "Flare Stack Relief",
    category: "Valves & Relief",
    blurb: "Estimation-grade flare tip sizing from an exit-Mach criterion, plus heat release, flame length and the minimum distance to meet an allowable thermal radiation level (API 521).",
    inputs: [
      { key: "W", label: "Relief gas rate", type: "number", dim: "massflow", default: 20, defaultUnit: "kg/s" },
      { key: "MW", label: "Molecular weight", type: "number", default: 44 },
      { key: "T", label: "Gas temperature", type: "number", dim: "temperature", default: 60, defaultUnit: "°C" },
      { key: "k", label: "Cp/Cv (k)", type: "number", default: 1.2 },
      { key: "Z", label: "Compressibility Z", type: "number", default: 1.0 },
      { key: "P", label: "Flare tip pressure (abs)", type: "number", dim: "pressure", default: 101.325, defaultUnit: "kPa" },
      { key: "Mach", label: "Max exit Mach number", type: "number", default: 0.5 },
      { key: "LHV", label: "Lower heating value", type: "number", dim: "spec_energy", default: 46000, defaultUnit: "kJ/kg" },
      { key: "frad", label: "Radiant fraction F", type: "number", default: 0.3 },
      { key: "tau", label: "Atmospheric transmissivity τ", type: "number", default: 1.0 },
      { key: "Kallow", label: "Allowable radiation at receiver", type: "number", dim: "htc", default: 0, defaultUnit: "W/(m2·K)", optional: true, help: "Leave 0 to use API 521 levels (1.58 / 4.73 / 6.31 kW/m²)" },
    ],
    compute: (v) => {
      // sonic velocity a = sqrt(k Z R T / MW); exit velocity = Mach * a
      const a = Math.sqrt((v.k * v.Z * Rgas * v.T) / v.MW); // m/s
      const vexit = v.Mach * a;
      const rho = (v.P * v.MW) / (v.Z * Rgas * v.T);         // kg/m3, ideal-ish
      const Qvol = v.W / rho;                                 // m3/s actual
      const Atip = Qvol / vexit;
      const Dtip = Math.sqrt((4 * Atip) / Math.PI);
      const pipe = PET.standards.selectPipe(Dtip, 40);

      const Qheat = v.W * v.LHV;                              // W (LHV in J/kg SI)
      // flame length (API 521 approx): L = 0.00326 * Qheat^0.478 (Qheat in W -> m), uses a common correlation
      const L = 0.00326 * Math.pow(Qheat, 0.478);

      // distance to allowable radiation, point-source: K = tau*F*Q/(4*pi*D^2) -> D = sqrt(tau F Q /(4 pi K))
      function dist(K) { return Math.sqrt((v.tau * v.frad * Qheat) / (4 * Math.PI * K)); }
      const levels = v.Kallow && v.Kallow > 0
        ? [["user", v.Kallow]]
        : [["Continuous exposure (1.58 kW/m²)", 1580], ["Emergency, ~few s (4.73 kW/m²)", 4730], ["Escape, brief (6.31 kW/m²)", 6310]];

      const machChoke = v.Mach >= 1;
      const checks = [{
        label: "Exit Mach criterion", status: v.Mach <= 0.5 ? "ok" : (v.Mach < 1 ? "warn" : "fail"),
        detail: `Exit velocity ${PET.fmt(vexit)} m/s at Mach ${v.Mach} (sonic a = ${PET.fmt(a)} m/s). API 521 commonly limits steady flaring to ≈0.5 Mach (up to ~0.8 short-term).`,
        ref: "API 521 §5.8 (flare tip velocity)",
      }];
      if (pipe.oversize) checks.push({ label: "Tip size", status: "warn", detail: "Required tip exceeds 24\" tabulated; large flares use purpose-built tips.", ref: "" });

      const outputs = [
        { label: "Required tip area", value: Atip, dim: "area", preferUnit: "m2" },
        { label: "Required tip diameter", value: Dtip, dim: "length", preferUnit: "mm" },
        { label: "Nearest standard pipe tip", value: pipe.nps, unit: "NPS (in), Sch 40", fixedUnit: true },
        { label: "Heat release", value: Qheat, dim: "power", preferUnit: "MW" },
        { label: "Estimated flame length", value: L, dim: "length", preferUnit: "m" },
      ];
      levels.forEach(([name, K]) =>
        outputs.push({ label: `Min distance — ${name}`, value: dist(K), dim: "length", preferUnit: "m" }));

      return {
        outputs, checks,
        notes: [
          "Screening estimate: point-source radiation model, simplified flame-length correlation, ideal-gas density.",
          "Detailed design must include wind tilt, multiple receivers, and a rigorous flame model.",
        ],
        refs: ["API Std 521 (Pressure-relieving and Depressuring Systems)", "API Std 537 (Flare Details)"],
      };
    },
  });

  /* =========================== NOISE SCREENING =========================== */
  PET.registerTool({
    id: "noise",
    name: "Noise Calculations (screening)",
    category: "General",
    blurb: "Screening-level aerodynamic noise for a control valve and a pipe-velocity noise indicator. For detailed predictions use the full IEC 60534-8-3 method.",
    inputs: [
      { key: "mode", label: "Source", type: "select", options: () => ["Control valve (gas)", "Pipe flow velocity"], default: "Control valve (gas)" },
      { key: "P1", label: "Inlet pressure (abs)", type: "number", dim: "pressure", default: 600, defaultUnit: "kPa", showIf: { key: "mode", eq: "Control valve (gas)" } },
      { key: "P2", label: "Outlet pressure (abs)", type: "number", dim: "pressure", default: 200, defaultUnit: "kPa", showIf: { key: "mode", eq: "Control valve (gas)" } },
      { key: "W", label: "Mass flow", type: "number", dim: "massflow", default: 2, defaultUnit: "kg/s", showIf: { key: "mode", eq: "Control valve (gas)" } },
      { key: "rho", label: "Fluid density", type: "number", dim: "density", default: 5, defaultUnit: "kg/m3", showIf: { key: "mode", eq: "Pipe flow velocity" } },
      { key: "Qv", label: "Volumetric flow", type: "number", dim: "volflow", default: 1000, defaultUnit: "m3/h", showIf: { key: "mode", eq: "Pipe flow velocity" } },
      { key: "D", label: "Pipe inside diameter", type: "number", dim: "length", default: 150, defaultUnit: "mm", showIf: { key: "mode", eq: "Pipe flow velocity" } },
    ],
    compute: (v) => {
      const checks = [], outputs = [];
      if (v.mode === "Control valve (gas)") {
        const x = (v.P1 - v.P2) / v.P1;
        // crude screening SPL estimate: rises with pressure ratio and flow (NOT a code calc)
        const spl = 50 + 30 * Math.log10(v.P1 / v.P2) + 10 * Math.log10(Math.max(v.W, 1e-3) * 1000);
        outputs.push({ label: "Pressure ratio x = ΔP/P1", value: x, unit: "—", fixedUnit: true });
        outputs.push({ label: "Screening SPL (≈1 m)", value: spl, unit: "dB(A)", fixedUnit: true });
        checks.push({
          label: "Noise risk", status: spl < 85 ? "ok" : (spl < 110 ? "warn" : "fail"),
          detail: spl < 85 ? "Below ~85 dB(A) screening threshold."
            : spl < 110 ? "Elevated: consider low-noise trim or path treatment."
              : "High: multi-stage/low-noise trim and acoustic insulation likely required.",
          ref: "IEC 60534-8-3 (use full method for design)",
        });
      } else {
        const vel = PET.fluids.velocity(v.Qv, v.D);
        const rhoV2 = v.rho * vel * vel;
        outputs.push({ label: "Velocity", value: vel, dim: "velocity", preferUnit: "m/s" });
        outputs.push({ label: "ρ·v² (energy indicator)", value: rhoV2, unit: "Pa", fixedUnit: true });
        checks.push({
          label: "Pipe noise / vibration indicator", status: rhoV2 < 5000 ? "ok" : (rhoV2 < 10000 ? "warn" : "fail"),
          detail: `ρv² = ${PET.fmt(rhoV2)} Pa. Energy Institute screening: ρv² above ~5000 Pa (gas) flags flow-induced vibration/noise review; >10000 Pa is high risk.`,
          ref: "Energy Institute AVIFF guidelines",
        });
      }
      return {
        outputs, checks,
        notes: ["These are screening indicators only — not a substitute for the full IEC 60534-8-3 valve-noise prediction or a vibration study."],
        refs: ["IEC 60534-8-3 (control-valve aerodynamic noise)", "Energy Institute — Avoidance of Flow-Induced Vibration"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
