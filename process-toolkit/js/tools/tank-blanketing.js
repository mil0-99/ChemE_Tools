/* tools/tank-blanketing.js — Tank Blanketing / Venting (API 2000) */
(function (global) {
  const PET = global.PET || (global.PET = {});

  PET.registerTool({
    id: "tank-blanketing",
    name: "Tank Blanketing / Venting",
    category: "Valves & Relief",
    blurb: "Normal inbreathing (vacuum / blanket-gas makeup) and outbreathing (pressure venting) for an atmospheric tank from liquid movement plus an API 2000 thermal estimate.",
    inputs: [
      { key: "Vtank", label: "Tank volume", type: "number", dim: "volume", default: 100, defaultUnit: "m3" },
      { key: "pumpOut", label: "Max pump-out (liquid withdrawal)", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h" },
      { key: "pumpIn", label: "Max pump-in (liquid fill)", type: "number", dim: "volflow", default: 50, defaultUnit: "m3/h" },
      { key: "volatility", label: "Liquid volatility", type: "select", options: () => ["Non-volatile (flash ≥ 60 °C)", "Volatile / flashing"], default: "Non-volatile (flash ≥ 60 °C)" },
      { key: "Ri", label: "Insulation reduction factor (1 = uninsulated)", type: "number", default: 1.0 },
    ],
    compute: (v) => {
      const Vt = v.Vtank;                 // m3
      const pumpOut = v.pumpOut * 3600;   // m3/s -> m3/h
      const pumpIn = v.pumpIn * 3600;
      const volatile = v.volatility.indexOf("Volatile") === 0;

      // API 2000 (7th ed.) thermal estimate, SI, uninsulated basis (× Ri):
      const thermalIn = 4.0 * Math.pow(Vt, 0.7) * v.Ri;   // Nm³/h air (vacuum)
      const thermalOut = 0.32 * Math.pow(Vt, 0.9) * v.Ri; // Nm³/h air (pressure)

      // liquid movement: emptying -> inbreathing == outflow; filling -> outbreathing
      const liqIn = pumpOut;                       // gas drawn in while emptying
      const volFactor = volatile ? 2 : 1;          // screening allowance for evaporation
      const liqOut = pumpIn * volFactor;

      const totalIn = liqIn + thermalIn;           // Nm³/h — vacuum relief / blanket makeup
      const totalOut = liqOut + thermalOut;        // Nm³/h — pressure relief / PVRV

      const toSI = (m3h) => m3h / 3600;            // -> m3/s for output dim

      const checks = [{
        label: "Basis", status: "ok",
        detail: "Inbreathing = max liquid out + thermal vacuum; outbreathing = max liquid in (× evaporation factor) + thermal pressure. Rates are normal-condition gas (air-equivalent) volumes.",
        ref: "API Std 2000, 7th ed.",
      }];
      if (volatile) checks.push({
        label: "Volatile service", status: "warn",
        detail: "A 2× allowance on fill-displacement is a screening shortcut only — flashing/boiling and vapor generation must be evaluated rigorously for volatile liquids.",
        ref: "API Std 2000",
      });
      checks.push({
        label: "Thermal estimate", status: "warn",
        detail: `Thermal terms use the API 2000 uninsulated equations (in: 4·V^0.7, out: 0.32·V^0.9, V in m³). Confirm the in-breathing factor for your specific stored fluid and latitude from the standard's tables.`,
        ref: "API Std 2000 Annex A",
      });

      return {
        outputs: [
          { label: "Total inbreathing (vacuum / N₂ makeup)", value: toSI(totalIn), dim: "volflow", preferUnit: "m3/h" },
          { label: "Total outbreathing (pressure relief)", value: toSI(totalOut), dim: "volflow", preferUnit: "m3/h" },
          { label: "— liquid movement (in)", value: toSI(liqIn), dim: "volflow", preferUnit: "m3/h" },
          { label: "— thermal vacuum (in)", value: toSI(thermalIn), dim: "volflow", preferUnit: "m3/h" },
          { label: "— liquid movement (out)", value: toSI(liqOut), dim: "volflow", preferUnit: "m3/h" },
          { label: "— thermal pressure (out)", value: toSI(thermalOut), dim: "volflow", preferUnit: "m3/h" },
        ],
        checks,
        notes: ["Rates are at normal (standard) conditions, expressed as air-equivalent volume. Size the blanketing regulator/PVRV for the larger of the in/out requirements with appropriate margin."],
        refs: ["API Standard 2000 — Venting Atmospheric and Low-Pressure Storage Tanks"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
