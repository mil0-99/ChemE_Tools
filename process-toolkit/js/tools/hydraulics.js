/* tools/hydraulics.js — Pressure Loss in a Pipe + Pump Sizing & Selection */
(function (global) {
  const PET = global.PET || (global.PET = {});

  /* ========================== PRESSURE LOSS ========================== */
  PET.registerTool({
    id: "pressure-loss",
    name: "Pressure Loss in a Pipe",
    category: "Hydraulics",
    blurb: "Darcy–Weisbach pressure drop with the Churchill friction factor (laminar→turbulent), fittings (ΣK) and elevation.",
    inputs: [
      { key: "basis", label: "Flow basis", type: "select", options: () => ["Volumetric", "Mass"], default: "Volumetric" },
      { key: "Qv", label: "Volumetric flow", type: "number", dim: "volflow", default: 30, defaultUnit: "m3/h", showIf: { key: "basis", eq: "Volumetric" } },
      { key: "Qm", label: "Mass flow", type: "number", dim: "massflow", default: 8, defaultUnit: "kg/s", showIf: { key: "basis", eq: "Mass" } },
      { key: "rho", label: "Density", type: "number", dim: "density", default: 1000, defaultUnit: "kg/m3" },
      { key: "mu", label: "Dynamic viscosity", type: "number", dim: "dynviscosity", default: 1, defaultUnit: "cP" },
      { key: "D", label: "Pipe inside diameter", type: "number", dim: "length", default: 100, defaultUnit: "mm" },
      { key: "L", label: "Pipe length", type: "number", dim: "length", default: 100, defaultUnit: "m" },
      { key: "mat", label: "Pipe material (roughness)", type: "select", options: () => Object.keys(PET.fluids.ROUGHNESS), default: "Commercial steel" },
      { key: "sumK", label: "Sum of fitting K factors (ΣK)", type: "number", default: 0 },
      { key: "dz", label: "Elevation change (outlet − inlet)", type: "number", dim: "length", default: 0, defaultUnit: "m" },
    ],
    compute: (v) => {
      const Q = v.basis === "Volumetric" ? v.Qv : v.Qm / v.rho;
      const D = v.D, vel = PET.fluids.velocity(Q, D);
      const Re = PET.fluids.reynolds(v.rho, vel, D, v.mu);
      const eps = PET.fluids.ROUGHNESS[v.mat];
      const f = PET.fluids.churchillF(Re, eps, D);
      const dyn = 0.5 * v.rho * vel * vel;
      const dpFric = f * (v.L / D) * dyn;
      const dpFit = v.sumK * dyn;
      const dpElev = v.rho * PET.fluids.g * v.dz;
      const total = dpFric + dpFit + dpElev;
      const regime = Re < 2300 ? "laminar" : Re < 4000 ? "transitional" : "turbulent";

      const checks = [{
        label: "Flow regime", status: regime === "transitional" ? "warn" : "ok",
        detail: `Re = ${PET.fmt(Re)} → ${regime}` + (regime === "transitional" ? " (friction factor uncertain in 2300–4000)." : "."),
        ref: "Darcy–Weisbach; Churchill (1977)",
      }];

      return {
        outputs: [
          { label: "Velocity", value: vel, dim: "velocity", preferUnit: "m/s" },
          { label: "Reynolds number", value: Re, unit: "—", fixedUnit: true },
          { label: "Darcy friction factor", value: f, unit: "—", fixedUnit: true },
          { label: "Friction loss", value: dpFric, dim: "pressure", preferUnit: "kPa" },
          { label: "Fittings loss (ΣK)", value: dpFit, dim: "pressure", preferUnit: "kPa" },
          { label: "Elevation change", value: dpElev, dim: "pressure", preferUnit: "kPa" },
          { label: "Total pressure drop", value: total, dim: "pressure", preferUnit: "kPa" },
        ],
        checks,
        notes: ["Use the Pipe Sizing tool's Crane K-values to build ΣK for elbows, tees and valves."],
        refs: ["Darcy–Weisbach equation", "Churchill, S.W. (1977), Chem. Eng.", "Crane TP-410 (fitting K, roughness)"],
      };
    },
  });

  /* =========================== PUMP SIZING =========================== */
  PET.registerTool({
    id: "pump-sizing",
    name: "Pump Sizing & Selection",
    category: "Rotating Equipment",
    blurb: "Differential head, hydraulic & brake power, NEMA motor selection with margin, and NPSH margin check.",
    inputs: [
      { key: "Qv", label: "Volumetric flow", type: "number", dim: "volflow", default: 30, defaultUnit: "m3/h" },
      { key: "rho", label: "Density", type: "number", dim: "density", default: 1000, defaultUnit: "kg/m3" },
      { key: "headMode", label: "Specify duty as", type: "select", options: () => ["Differential head", "Differential pressure"], default: "Differential head" },
      { key: "H", label: "Differential head", type: "number", dim: "length", default: 50, defaultUnit: "m", showIf: { key: "headMode", eq: "Differential head" } },
      { key: "dP", label: "Differential pressure", type: "number", dim: "pressure", default: 5, defaultUnit: "bar", showIf: { key: "headMode", eq: "Differential pressure" } },
      { key: "eff", label: "Pump efficiency (%)", type: "number", default: 70 },
      { key: "motorMargin", label: "Motor sizing margin (%)", type: "number", default: 15 },
      { key: "npsha", label: "NPSH available", type: "number", dim: "length", default: 6, defaultUnit: "m" },
      { key: "npshr", label: "NPSH required (vendor)", type: "number", dim: "length", default: 3, defaultUnit: "m" },
      { key: "npshMargin", label: "Required NPSH margin", type: "number", dim: "length", default: 1, defaultUnit: "m" },
    ],
    compute: (v) => {
      const g = PET.fluids.g;
      const H = v.headMode === "Differential head" ? v.H : v.dP / (v.rho * g);
      const dP = v.rho * g * H;
      const Ph = v.Qv * dP;                  // hydraulic power, W
      const Pb = Ph / (v.eff / 100);         // brake power, W
      const Pmotor = Pb * (1 + v.motorMargin / 100);
      const hp = Pmotor / 745.699872;
      const motorHp = PET.standards.selectMotorHp(hp);

      const npshAvailMargin = v.npsha - v.npshr;
      const checks = [{
        label: "NPSH margin",
        status: npshAvailMargin >= v.npshMargin ? "ok" : "fail",
        detail: `NPSHa − NPSHr = ${PET.fmt(npshAvailMargin)} m; required margin ${PET.fmt(v.npshMargin)} m.` +
          (npshAvailMargin < v.npshMargin ? " Cavitation risk — raise suction head or reduce NPSHr." : ""),
        ref: "API 610 / HI 9.6.1 (NPSH margin guidance)",
      }, {
        label: "Efficiency sanity", status: v.eff > 0 && v.eff <= 90 ? "ok" : "warn",
        detail: `Assumed ${v.eff}% — typical centrifugal BEP efficiency 60–85% for this size class.`,
        ref: "Hydraulic Institute",
      }];

      return {
        outputs: [
          { label: "Differential head", value: H, dim: "length", preferUnit: "m" },
          { label: "Differential pressure", value: dP, dim: "pressure", preferUnit: "bar" },
          { label: "Hydraulic power", value: Ph, dim: "power", preferUnit: "kW" },
          { label: "Brake power (shaft)", value: Pb, dim: "power", preferUnit: "kW" },
          { label: "Motor power w/ margin", value: Pmotor, dim: "power", preferUnit: "kW" },
          { label: "Recommended motor", value: motorHp, unit: "hp (NEMA)", fixedUnit: true },
        ],
        checks,
        notes: [`Hydraulic power Pₕ = Q·ΔP = ρ·g·Q·H. Brake power = Pₕ/η.`,
          `Selected next standard motor ≥ ${PET.fmt(hp)} hp computed demand.`],
        refs: ["Hydraulic Institute Standards", "API 610 (centrifugal pumps)", "NEMA MG-1 (motor ratings)"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
