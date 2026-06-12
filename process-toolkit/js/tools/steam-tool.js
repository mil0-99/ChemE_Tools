/* tools/steam-tool.js — Steam Property Calculator (IAPWS-IF97) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  PET.registerTool({
    id: "steam-properties",
    name: "Steam Property Calculator",
    category: "Heat Transfer",
    blurb: "Water/steam properties from the IAPWS-IF97 standard. Enter pressure & temperature for single-phase properties, or a pressure alone for saturation (liquid, vapor, latent heat).",
    inputs: [
      { key: "mode", label: "Lookup", type: "select", options: () => ["Saturation (from pressure)", "P and T (single phase)"], default: "Saturation (from pressure)" },
      { key: "P", label: "Pressure (abs)", type: "number", dim: "pressure", default: 1000, defaultUnit: "kPa" },
      { key: "T", label: "Temperature", type: "number", dim: "temperature", default: 250, defaultUnit: "°C", showIf: { key: "mode", eq: "P and T (single phase)" } },
    ],
    compute: (v) => {
      const checks = [], notes = [];
      if (v.mode.indexOf("Saturation") === 0) {
        if (v.P < 611.657 || v.P > 22.064e6) {
          return {
            outputs: [], notes: [],
            checks: [{ label: "Range", status: "fail", detail: "Pressure outside the IF97 saturation range (0.611 kPa – 22.064 MPa).", ref: "IAPWS-IF97" }],
            refs: ["IAPWS-IF97"],
          };
        }
        const s = PET.steam.saturation(v.P);
        return {
          outputs: [
            { label: "Saturation temperature", value: s.Tsat, dim: "temperature", preferUnit: "°C" },
            { label: "hf (sat. liquid enthalpy)", value: s.liquid.h, dim: "spec_energy", preferUnit: "kJ/kg" },
            { label: "hg (sat. vapor enthalpy)", value: s.vapor.h, dim: "spec_energy", preferUnit: "kJ/kg" },
            { label: "hfg (latent heat)", value: s.hfg, dim: "spec_energy", preferUnit: "kJ/kg" },
            { label: "ρf (sat. liquid density)", value: s.liquid.rho, dim: "density", preferUnit: "kg/m3" },
            { label: "ρg (sat. vapor density)", value: s.vapor.rho, dim: "density", preferUnit: "kg/m3" },
            { label: "sf (sat. liquid entropy)", value: s.liquid.s, dim: "spec_heat", preferUnit: "kJ/(kg·K)" },
            { label: "sg (sat. vapor entropy)", value: s.vapor.s, dim: "spec_heat", preferUnit: "kJ/(kg·K)" },
          ],
          checks: [{ label: "State", status: "ok", detail: `Saturation at ${PET.fmt(v.P / 1000)} kPa → Tsat ${PET.fmt(s.Tsat - 273.15)} °C.`, ref: "IAPWS-IF97 Region 4" }],
          notes: ["Latent heat hfg = hg − hf."],
          refs: ["IAPWS-IF97 (R7-97)"],
        };
      }

      const r = PET.steam.props(v.P, v.T);
      checks.push({
        label: "Phase / region",
        status: "ok",
        detail: `IF97 Region ${r.region} — ${r.phase}. Tsat at this pressure = ${PET.fmt(r.Tsat - 273.15)} °C.`,
        ref: "IAPWS-IF97",
      });
      if (r.region === 1) notes.push("Compressed-liquid region. Near the saturation line, treat liquid enthalpy as estimation-grade (≈0.05%).");
      return {
        outputs: [
          { label: "Specific volume", value: r.v, unit: "m³/kg", fixedUnit: true },
          { label: "Density", value: r.rho, dim: "density", preferUnit: "kg/m3" },
          { label: "Enthalpy h", value: r.h, dim: "spec_energy", preferUnit: "kJ/kg" },
          { label: "Entropy s", value: r.s, dim: "spec_heat", preferUnit: "kJ/(kg·K)" },
          { label: "Specific heat cp", value: r.cp, dim: "spec_heat", preferUnit: "kJ/(kg·K)" },
        ],
        checks, notes,
        refs: ["IAPWS-IF97 (R7-97), Regions 1, 2 & 4"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
