/* standards.js — realistic equipment data and industry heuristics so the
 * tools recommend things that actually exist (real pipe IDs, API orifice
 * letters, NEMA motor sizes) and flag values that break common rules of thumb.
 * Sources noted inline; see README references section. */
(function (global) {
  const PET = global.PET || (global.PET = {});

  /* ---- ASME B36.10 carbon-steel pipe: NPS, OD(in), wall(in) for Sch 40 & 80.
   * ID is computed as OD - 2*wall. Covers the common process range. ---- */
  const PIPE = [
    // nps, OD_in, wall40_in, wall80_in
    [0.5, 0.840, 0.109, 0.147],
    [0.75, 1.050, 0.113, 0.154],
    [1, 1.315, 0.133, 0.179],
    [1.5, 1.900, 0.145, 0.200],
    [2, 2.375, 0.154, 0.218],
    [3, 3.500, 0.216, 0.300],
    [4, 4.500, 0.237, 0.337],
    [6, 6.625, 0.280, 0.432],
    [8, 8.625, 0.322, 0.500],
    [10, 10.750, 0.365, 0.594],
    [12, 12.750, 0.406, 0.688],
    [14, 14.000, 0.438, 0.750],
    [16, 16.000, 0.500, 0.844],
    [18, 18.000, 0.562, 0.938],
    [20, 20.000, 0.594, 1.031],
    [24, 24.000, 0.688, 1.219],
  ].map(([nps, od, w40, w80]) => ({
    nps, od_in: od,
    id40_in: od - 2 * w40,
    id80_in: od - 2 * w80,
    id40_m: (od - 2 * w40) * 0.0254,
    id80_m: (od - 2 * w80) * 0.0254,
  }));

  /** Pick the smallest standard pipe whose ID >= required ID (metres). */
  function selectPipe(reqID_m, schedule) {
    const key = schedule === 80 ? "id80_m" : "id40_m";
    for (const p of PIPE) if (p[key] >= reqID_m) return { ...p, schedule, id_m: p[key] };
    const last = PIPE[PIPE.length - 1];
    return { ...last, schedule, id_m: last[key], oversize: true };
  }

  /* ---- API 526 standard relief-valve orifice designations, area in in^2 ---- */
  const PSV_ORIFICE = [
    ["D", 0.110], ["E", 0.196], ["F", 0.307], ["G", 0.503], ["H", 0.785],
    ["J", 1.287], ["K", 1.838], ["L", 2.853], ["M", 3.60], ["N", 4.34],
    ["P", 6.38], ["Q", 11.05], ["R", 16.0], ["T", 26.0],
  ].map(([letter, in2]) => ({ letter, area_in2: in2, area_m2: in2 * 6.4516e-4 }));

  /** Smallest API orifice whose area >= required (m^2). */
  function selectOrifice(reqArea_m2) {
    for (const o of PSV_ORIFICE) if (o.area_m2 >= reqArea_m2) return o;
    return { ...PSV_ORIFICE[PSV_ORIFICE.length - 1], oversize: true };
  }

  /* ---- NEMA / IEC standard motor ratings (hp) ---- */
  const MOTOR_HP = [0.5, 0.75, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40,
    50, 60, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500];
  function selectMotorHp(reqHp) {
    for (const m of MOTOR_HP) if (m >= reqHp) return m;
    return MOTOR_HP[MOTOR_HP.length - 1];
  }

  /* ---- Crane TP-410 resistance coefficients K for common fittings ---- */
  const FITTING_K = {
    "90° elbow (std)": 0.75, "90° elbow (long radius)": 0.45, "45° elbow": 0.35,
    "Tee (flow through run)": 0.4, "Tee (flow through branch)": 1.0,
    "Gate valve (open)": 0.17, "Globe valve (open)": 10.0, "Ball valve (open)": 0.05,
    "Check valve (swing)": 2.0, "Butterfly valve (open)": 0.86,
    "Entrance (sharp)": 0.5, "Exit": 1.0,
  };

  /* ---- Recommended velocity guidelines (m/s).
   * Liquid: typical process pump piping; Gas: general process.
   * Sources: GPSA Engineering Data Book, Coulson & Richardson Vol.6. ---- */
  const VELOCITY = {
    "Liquid – pump suction": [0.6, 1.5],
    "Liquid – pump discharge": [1.5, 3.0],
    "Liquid – general line": [1.0, 2.5],
    "Gas / vapor – general": [10, 30],
    "Steam – saturated": [20, 40],
    "Steam – superheated": [30, 60],
  };

  /* ---- Typical overall U values (W/m2·K) by service. Perry's 8th / TEMA. ---- */
  const U_TYPICAL = {
    "Water / water": [800, 1500],
    "Water / light organic": [350, 750],
    "Water / heavy organic": [60, 300],
    "Steam / water": [1000, 1500],
    "Steam / light organic": [500, 1000],
    "Light organic / light organic": [200, 425],
    "Gas / gas (low P)": [10, 50],
    "Condensing steam / boiling water": [1500, 4000],
  };

  /* ---- Compressor heuristics (GPSA): per-stage limits ---- */
  const COMPRESSOR = {
    maxRatioPerStage: 3.5,          // typical economical max compression ratio/stage
    maxDischargeTemp_C: 150,        // common reciprocating discharge-temp limit
    maxDischargeTempCentrifugal_C: 175,
  };

  PET.standards = {
    PIPE, selectPipe, PSV_ORIFICE, selectOrifice, MOTOR_HP, selectMotorHp,
    FITTING_K, VELOCITY, U_TYPICAL, COMPRESSOR,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = PET.standards;
})(typeof window !== "undefined" ? window : globalThis);
