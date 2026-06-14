/* tools/heat-exchanger.js — HX Design (LMTD area) + HX Rating (ε-NTU) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  function lmtd(dt1, dt2) {
    if (dt1 <= 0 || dt2 <= 0) return NaN;
    if (Math.abs(dt1 - dt2) < 1e-9) return dt1;
    return (dt1 - dt2) / Math.log(dt1 / dt2);
  }

  /* ===================== HEAT EXCHANGER DESIGN (LMTD) ===================== */
  PET.registerTool({
    id: "hx-design",
    name: "Heat Exchanger Design (LMTD)",
    category: "Heat Transfer",
    blurb: "Find the duty and required surface area from terminal temperatures using the LMTD method, with a typical-U lookup, design margin and a temperature-cross check.",
    inputs: [
      { key: "arr", label: "Flow arrangement", type: "select", options: () => ["Counter-current", "Co-current"], default: "Counter-current" },
      { key: "dutyMode", label: "Duty from", type: "select", options: () => ["Hot stream m·Cp", "Direct duty"], default: "Hot stream m·Cp" },
      { key: "mh", label: "Hot mass flow", type: "number", dim: "massflow", default: 10, defaultUnit: "kg/s", showIf: { key: "dutyMode", eq: "Hot stream m·Cp" } },
      { key: "cph", label: "Hot specific heat", type: "number", dim: "spec_heat", default: 4180, defaultUnit: "J/(kg·K)", showIf: { key: "dutyMode", eq: "Hot stream m·Cp" } },
      { key: "Q", label: "Heat duty", type: "number", dim: "power", default: 500, defaultUnit: "kW", showIf: { key: "dutyMode", eq: "Direct duty" } },
      { key: "Thi", label: "Hot inlet temp", type: "number", dim: "temperature", default: 120, defaultUnit: "°C" },
      { key: "Tho", label: "Hot outlet temp", type: "number", dim: "temperature", default: 60, defaultUnit: "°C" },
      { key: "Tci", label: "Cold inlet temp", type: "number", dim: "temperature", default: 25, defaultUnit: "°C" },
      { key: "Tco", label: "Cold outlet temp", type: "number", dim: "temperature", default: 50, defaultUnit: "°C" },
      { key: "Umode", label: "Overall U", type: "select", options: () => ["From typical service", "Enter value"], default: "From typical service" },
      { key: "service", label: "Service (typical U)", type: "select", options: () => Object.keys(PET.standards.U_TYPICAL), default: "Water / water", showIf: { key: "Umode", eq: "From typical service" } },
      { key: "Uval", label: "Overall U", type: "number", dim: "htc", default: 500, defaultUnit: "W/(m2·K)", showIf: { key: "Umode", eq: "Enter value" } },
      { key: "F", label: "LMTD correction factor F", type: "number", default: 1.0 },
      { key: "margin", label: "Area design margin (%)", type: "number", default: 15 },
    ],
    compute: (v) => {
      const Q = v.dutyMode === "Direct duty" ? v.Q : v.mh * v.cph * (v.Thi - v.Tho); // W
      let dt1, dt2;
      if (v.arr === "Counter-current") { dt1 = v.Thi - v.Tco; dt2 = v.Tho - v.Tci; }
      else { dt1 = v.Thi - v.Tci; dt2 = v.Tho - v.Tco; }
      const LM = lmtd(dt1, dt2);
      const Urange = PET.standards.U_TYPICAL[v.service];
      const U = v.Umode === "Enter value" ? v.Uval : (Urange[0] + Urange[1]) / 2;
      const A = Q / (U * v.F * LM);
      const Adesign = A * (1 + v.margin / 100);

      const checks = [];
      const cross = (v.arr === "Co-current") && (v.Tco >= v.Tho);
      checks.push({
        label: "Temperature feasibility",
        status: (dt1 > 0 && dt2 > 0) ? "ok" : "fail",
        detail: (dt1 > 0 && dt2 > 0) ? `Both terminal ΔT positive (${PET.fmt(dt1)} K, ${PET.fmt(dt2)} K).`
          : "Temperature cross — outlet temperatures are infeasible for this arrangement. Use counter-current or revise temperatures.",
        ref: "Perry's Chemical Engineers' Handbook (8th)",
      });
      checks.push({
        label: "LMTD correction factor",
        status: v.F >= 0.8 ? "ok" : "warn",
        detail: `F = ${PET.fmt(v.F)}. Designs with F < 0.8 indicate a temperature cross — add shell passes or units.`,
        ref: "TEMA; Bowman F-charts",
      });

      return {
        outputs: [
          { label: "Heat duty", value: Q, dim: "power", preferUnit: "kW" },
          { label: "LMTD", value: LM, dim: "temperature", preferUnit: "°C", hint: "ΔT (a K difference equals a °C difference)" },
          { label: "Overall U used", value: U, dim: "htc", preferUnit: "W/(m2·K)" },
          { label: "Required area (clean)", value: A, dim: "area", preferUnit: "m2" },
          { label: "Design area (with margin)", value: Adesign, dim: "area", preferUnit: "m2" },
        ],
        checks,
        notes: [
          v.Umode === "From typical service" ? `Typical U for "${v.service}": ${Urange[0]}–${Urange[1]} W/m²·K; midpoint used.` : "",
          "Area A = Q / (U · F · LMTD). LMTD shown is a temperature difference; the °C and K scales differ only by offset.",
        ].filter(Boolean),
        refs: ["Perry's Chemical Engineers' Handbook", "TEMA Standards", "Kern, Process Heat Transfer"],
      };
    },
  });

  /* ===================== HEAT EXCHANGER RATING (ε-NTU) ===================== */
  PET.registerTool({
    id: "hx-rating",
    name: "Heat Exchanger Rating (ε-NTU)",
    category: "Heat Transfer",
    blurb: "Given an existing area and U, find the duty and outlet temperatures with the effectiveness-NTU method.",
    inputs: [
      { key: "arr", label: "Flow arrangement", type: "select", options: () => ["Counter-current", "Co-current"], default: "Counter-current" },
      { key: "A", label: "Heat-transfer area", type: "number", dim: "area", default: 20, defaultUnit: "m2" },
      { key: "U", label: "Overall U", type: "number", dim: "htc", default: 500, defaultUnit: "W/(m2·K)" },
      { key: "mh", label: "Hot mass flow", type: "number", dim: "massflow", default: 10, defaultUnit: "kg/s" },
      { key: "cph", label: "Hot specific heat", type: "number", dim: "spec_heat", default: 4180, defaultUnit: "J/(kg·K)" },
      { key: "Thi", label: "Hot inlet temp", type: "number", dim: "temperature", default: 120, defaultUnit: "°C" },
      { key: "mc", label: "Cold mass flow", type: "number", dim: "massflow", default: 12, defaultUnit: "kg/s" },
      { key: "cpc", label: "Cold specific heat", type: "number", dim: "spec_heat", default: 4180, defaultUnit: "J/(kg·K)" },
      { key: "Tci", label: "Cold inlet temp", type: "number", dim: "temperature", default: 25, defaultUnit: "°C" },
    ],
    compute: (v) => {
      const Ch = v.mh * v.cph, Cc = v.mc * v.cpc;
      const Cmin = Math.min(Ch, Cc), Cmax = Math.max(Ch, Cc), Cr = Cmin / Cmax;
      const NTU = (v.U * v.A) / Cmin;
      let eps;
      if (v.arr === "Counter-current") {
        eps = Math.abs(Cr - 1) < 1e-9
          ? NTU / (1 + NTU)
          : (1 - Math.exp(-NTU * (1 - Cr))) / (1 - Cr * Math.exp(-NTU * (1 - Cr)));
      } else {
        eps = (1 - Math.exp(-NTU * (1 + Cr))) / (1 + Cr);
      }
      const Qmax = Cmin * (v.Thi - v.Tci);
      const Q = eps * Qmax;
      const Tho = v.Thi - Q / Ch;
      const Tco = v.Tci + Q / Cc;

      const checks = [{
        label: "Effectiveness", status: eps > 0 && eps < 1 ? "ok" : "warn",
        detail: `ε = ${PET.fmt(eps)}, NTU = ${PET.fmt(NTU)}, Cr = ${PET.fmt(Cr)}. ε approaching 1 means a very large/oversized unit.`,
        ref: "Kays & London, Compact Heat Exchangers",
      }];

      return {
        outputs: [
          { label: "NTU", value: NTU, unit: "—", fixedUnit: true },
          { label: "Effectiveness ε", value: eps, unit: "—", fixedUnit: true },
          { label: "Actual duty", value: Q, dim: "power", preferUnit: "kW" },
          { label: "Hot outlet temp", value: Tho, dim: "temperature", preferUnit: "°C" },
          { label: "Cold outlet temp", value: Tco, dim: "temperature", preferUnit: "°C" },
        ],
        checks,
        notes: ["Q = ε · C_min · (T_h,in − T_c,in). Assumes constant properties and U over the surface."],
        refs: ["Kays & London (ε-NTU)", "Incropera, Fundamentals of Heat and Mass Transfer"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
