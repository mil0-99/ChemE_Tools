/* tools/compressor.js — Compressor Sizing & Selection (adiabatic, with staging) */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const Rgas = 8314.462; // J/(kmol·K)

  PET.registerTool({
    id: "compressor-sizing",
    name: "Compressor Sizing & Selection",
    category: "Rotating Equipment",
    blurb: "Adiabatic head, gas power and discharge temperature, with automatic staging so per-stage compression ratio and discharge temperature stay within GPSA heuristics.",
    inputs: [
      { key: "Qm", label: "Mass flow", type: "number", dim: "massflow", default: 1, defaultUnit: "kg/s" },
      { key: "MW", label: "Molecular weight", type: "number", default: 18 },
      { key: "P1", label: "Suction pressure (abs)", type: "number", dim: "pressure", default: 100, defaultUnit: "kPa" },
      { key: "T1", label: "Suction temperature", type: "number", dim: "temperature", default: 30, defaultUnit: "°C" },
      { key: "P2", label: "Discharge pressure (abs)", type: "number", dim: "pressure", default: 1000, defaultUnit: "kPa" },
      { key: "k", label: "Cp/Cv (k)", type: "number", default: 1.3 },
      { key: "Z", label: "Average compressibility Z", type: "number", default: 1.0 },
      { key: "effAd", label: "Adiabatic efficiency (%)", type: "number", default: 75 },
      { key: "maxRatio", label: "Max compression ratio per stage", type: "number", default: 3.5 },
      { key: "maxTdis", label: "Max discharge temperature", type: "number", dim: "temperature", default: 150, defaultUnit: "°C" },
      { key: "intercoolT", label: "Interstage cooling back to (°)", type: "number", dim: "temperature", default: 40, defaultUnit: "°C" },
    ],
    compute: (v) => {
      const Rtot = v.P2 / v.P1;            // overall ratio
      const k = v.k, exp = (k - 1) / k;
      // stages from ratio limit
      let nStages = Math.max(1, Math.ceil(Math.log(Rtot) / Math.log(v.maxRatio)));
      // check discharge-temp limit at the resulting per-stage ratio; add stages if needed
      let rStage, T2;
      for (; ; nStages++) {
        rStage = Math.pow(Rtot, 1 / nStages);
        // isentropic efficiency: T2 = T1·(1 + (r^x − 1)/η), inlet cooled to T1
        T2 = v.T1 * (1 + (Math.pow(rStage, exp) - 1) / (v.effAd / 100));
        if (T2 <= v.maxTdis || nStages > 12) break;
      }

      // adiabatic head per stage (J/kg), summed
      const Rspec = Rtot; // unused placeholder
      const headStage = (v.Z * (Rgas / v.MW) * v.T1) * (1 / exp) * (Math.pow(rStage, exp) - 1);
      const headTotal = headStage * nStages; // assuming intercooling to same T1 each stage
      const gasPower = (v.Qm * headTotal) / (v.effAd / 100); // W

      const checks = [{
        label: "Compression ratio per stage",
        status: rStage <= v.maxRatio + 1e-6 ? "ok" : "warn",
        detail: `Per-stage ratio ${PET.fmt(rStage)} (limit ${v.maxRatio}). Overall ${PET.fmt(Rtot)} across ${nStages} stage(s).`,
        ref: "GPSA Engineering Data Book (Sec. 13)",
      }, {
        label: "Discharge temperature per stage",
        status: T2 <= v.maxTdis ? "ok" : "fail",
        detail: `Estimated discharge ${PET.fmt(T2 - 273.15)} °C vs limit ${PET.fmt(v.maxTdis - 273.15)} °C.` +
          (T2 > v.maxTdis ? " Add a stage or lower the ratio." : ""),
        ref: "GPSA; API 618/617 temperature limits",
      }];

      return {
        outputs: [
          { label: "Overall compression ratio", value: Rtot, unit: "—", fixedUnit: true },
          { label: "Number of stages", value: nStages, unit: "stages", fixedUnit: true },
          { label: "Ratio per stage", value: rStage, unit: "—", fixedUnit: true },
          { label: "Discharge temp per stage", value: T2, dim: "temperature", preferUnit: "°C" },
          { label: "Adiabatic head (total)", value: headTotal, dim: "spec_energy", preferUnit: "kJ/kg" },
          { label: "Gas power (shaft)", value: gasPower, dim: "power", preferUnit: "kW" },
        ],
        checks,
        notes: [
          `Equal ratio per stage = (P₂/P₁)^(1/n). Assumes interstage cooling back to suction temperature.`,
          `Discharge T estimated with adiabatic efficiency applied to the temperature rise.`,
        ],
        refs: ["GPSA Engineering Data Book", "API 617 (centrifugal) / API 618 (reciprocating)"],
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
