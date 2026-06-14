/* tools/basic.js — Unit Conversion + Pipe Sizing */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const U = () => PET.units, S = () => PET.standards, F = () => PET.fluids;

  /* ============================ UNIT CONVERTER ============================ */
  PET.registerTool({
    id: "unit-conversion",
    name: "Unit Conversion",
    category: "General",
    blurb: "Convert any quantity between engineering units across 18 dimensions.",
    inputs: [
      {
        key: "dim", label: "Quantity", type: "select",
        options: () => Object.keys(PET.units.D).filter((d) => d !== "dimensionless"),
        default: "pressure",
      },
      { key: "value", label: "Value", type: "number", default: 1 },
      {
        key: "from", label: "From unit", type: "select",
        options: (v) => PET.units.unitList(v.dim || "pressure"), dependsOn: "dim",
      },
      {
        key: "to", label: "To unit", type: "select",
        options: (v) => PET.units.unitList(v.dim || "pressure"), dependsOn: "dim",
      },
    ],
    compute: (v) => {
      const out = PET.units.convert(v.value, v.from, v.to, v.dim);
      return {
        outputs: [{ label: `Result in ${v.to}`, value: out, unit: v.to, fixedUnit: true }],
        checks: [], notes: [`${PET.fmt(v.value)} ${v.from} = ${PET.fmt(out)} ${v.to}`],
        refs: ["NIST SP 811 — Guide for the Use of the International System of Units"],
      };
    },
  });

  /* ============================== PIPE SIZING ============================== */
  PET.registerTool({
    id: "pipe-sizing",
    name: "Pipe Sizing",
    category: "Hydraulics",
    blurb: "Size a line from flow and a target velocity; selects a real ASME pipe and checks velocity heuristics + API RP 14E erosional limit.",
    inputs: [
      { key: "basis", label: "Flow basis", type: "select", options: () => ["Volumetric", "Mass"], default: "Volumetric" },
      { key: "Qv", label: "Volumetric flow", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h", showIf: { key: "basis", eq: "Volumetric" } },
      { key: "Qm", label: "Mass flow", type: "number", dim: "massflow", default: 10, defaultUnit: "kg/s", showIf: { key: "basis", eq: "Mass" } },
      { key: "rho", label: "Density", type: "number", dim: "density", default: 1000, defaultUnit: "kg/m3" },
      { key: "service", label: "Service (velocity guideline)", type: "select", options: () => Object.keys(PET.standards.VELOCITY), default: "Liquid – general line" },
      { key: "vt", label: "Target velocity (blank = use guideline mid)", type: "number", dim: "velocity", default: 0, defaultUnit: "m/s", optional: true },
      { key: "sched", label: "Pipe schedule", type: "select", options: () => ["40", "80"], default: "40" },
      { key: "margin", label: "Design margin on flow (%)", type: "number", default: 10 },
    ],
    compute: (v) => {
      const g = PET.standards.VELOCITY[v.service];
      const Q = v.basis === "Volumetric" ? v.Qv : v.Qm / v.rho; // m3/s
      const Qd = Q * (1 + v.margin / 100);
      const vt = v.vt && v.vt > 0 ? v.vt : (g[0] + g[1]) / 2;
      const Areq = Qd / vt;
      const Dreq = Math.sqrt((4 * Areq) / Math.PI);
      const pipe = PET.standards.selectPipe(Dreq, Number(v.sched));
      const vact = Qd / ((Math.PI / 4) * pipe.id_m * pipe.id_m);
      const rho_lbft3 = v.rho / 16.0184634;
      const Ve = (100 / Math.sqrt(rho_lbft3)) * 0.3048; // API 14E, C=100, m/s

      const checks = [];
      checks.push({
        label: "Velocity vs service guideline",
        status: vact >= g[0] && vact <= g[1] ? "ok" : "warn",
        detail: `Actual ${PET.fmt(vact)} m/s vs recommended ${g[0]}–${g[1]} m/s for "${v.service}".`,
        ref: "GPSA Engineering Data Book; Coulson & Richardson Vol. 6",
      });
      checks.push({
        label: "API RP 14E erosional limit",
        status: vact <= Ve ? "ok" : "fail",
        detail: `Actual ${PET.fmt(vact)} m/s vs erosional velocity ${PET.fmt(Ve)} m/s (C=100).`,
        ref: "API RP 14E",
      });
      if (pipe.oversize) checks.push({ label: "Size range", status: "warn", detail: "Required diameter exceeds the largest tabulated size (24\"). Consider multiple lines.", ref: "" });

      return {
        outputs: [
          { label: "Required inside diameter", value: Dreq, dim: "length", preferUnit: "mm" },
          { label: "Recommended pipe", value: pipe.nps, unit: `NPS (in), Sch ${v.sched}`, fixedUnit: true },
          { label: "Actual inside diameter", value: pipe.id_m, dim: "length", preferUnit: "mm" },
          { label: "Actual velocity (at design flow)", value: vact, dim: "velocity", preferUnit: "m/s" },
          { label: "Erosional velocity (API 14E)", value: Ve, dim: "velocity", preferUnit: "m/s" },
        ],
        checks,
        notes: [
          `Design flow includes a ${v.margin}% margin: ${PET.fmt(Qd)} m³/s.`,
          v.vt && v.vt > 0 ? `Target velocity: ${PET.fmt(vt)} m/s (user).` : `Target velocity: ${PET.fmt(vt)} m/s (guideline midpoint).`,
        ],
        refs: ["ASME B36.10M (pipe dimensions)", "API RP 14E (erosional velocity)", "GPSA Engineering Data Book"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
