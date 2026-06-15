/* tests/run.js — validates the calculation engine and every tool's compute()
 * against engineering reference values. Run: node tests/run.js */
const PET = require("../js/core.js");
require("../js/units.js");
require("../js/standards.js");
require("../js/fluids.js");
require("../js/steam.js");
// load every tool exactly as index.html does (parse its <script> tags), so the
// tests always match what the browser loads — add a tool tag there, nothing here.
const fs = require("fs"), path = require("path");
const indexHtml = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const toolFiles = (indexHtml.match(/js\/tools\/([\w-]+\.js)/g) || [])
  .map((s) => s.replace("js/tools/", ""));
toolFiles.forEach((f) => require("../js/tools/" + f));

let pass = 0, fail = 0;
function ok(name, cond, info) {
  if (cond) { pass++; }
  else { fail++; console.log("  FAIL:", name, info !== undefined ? "→ " + info : ""); }
}
function close(name, got, exp, rel) {
  const r = Math.abs(got - exp) / (Math.abs(exp) || 1);
  ok(name, r <= (rel || 1e-3), `got ${got}, exp ${exp} (rel ${r.toExponential(2)})`);
}
const U = PET.units;

console.log("UNITS");
close("psi→kPa", U.convert(100, "psi", "kPa", "pressure"), 689.4757, 1e-4);
close("psig→Pa abs", U.convert(0, "psig", "Pa", "pressure"), 101325, 1e-9);
close("°C→°F (100)", U.convert(100, "°C", "°F", "temperature"), 212, 1e-9);
close("°F→K (32)", U.convert(32, "°F", "K", "temperature"), 273.15, 1e-9);
close("m3/h→gpm", U.convert(10, "m3/h", "gpm(US)", "volflow"), 44.0287, 1e-4);
close("roundtrip ft→m→ft", U.convert(U.convert(12.34, "ft", "m", "length"), "m", "ft", "length"), 12.34, 1e-9);
close("SG density", U.convert(0.85, "SG", "kg/m3", "density"), 850, 1e-9);
close("cP→Pa·s", U.convert(1, "cP", "Pa·s", "dynviscosity"), 1e-3, 1e-9);

console.log("STEAM (IAPWS-IF97)");
const s2 = PET.steam.props(3500, 300); // Region 2 ref
close("R2 h(0.0035MPa,300K)", s2.h / 1000, 2549.91145, 1e-6);
close("R2 s", s2.s / 1000, 8.52238967, 1e-6);
const s1 = PET.steam.props(3e6, 300); // Region 1 ref
close("R1 h(3MPa,300K)", s1.h / 1000, 115.331273, 1e-6);
close("Psat(500K)", PET.steam.psat(500) / 1e6, 2.63889776, 1e-6);
close("Tsat(1MPa)", PET.steam.tsat(1e6), 453.035632, 1e-6);
const sat = PET.steam.saturation(10e5); // 10 bar steam-table cross-check
close("hf@10bar", sat.liquid.h / 1000, 762.6, 2e-3);
close("hfg@10bar", sat.hfg / 1000, 2014.6, 2e-3);

console.log("FLUIDS");
const Re = PET.fluids.reynolds(1000, 2, 0.1, 1e-3);
close("Reynolds", Re, 2e5, 1e-9);
const f = PET.fluids.churchillF(2e5, 4.6e-5, 0.1);
ok("Churchill f in range", f > 0.015 && f < 0.025, f);
const flam = PET.fluids.churchillF(1000, 4.6e-5, 0.1);
close("Churchill laminar→64/Re", flam, 64 / 1000, 5e-3);

console.log("TOOL: pipe-sizing (real NPS, velocity & erosional checks)");
let r = PET.calc["pipe-sizing"]({
  basis: "Volumetric", Qv: U.toBase(100, "m3/h", "volflow"), Qm: 0,
  rho: 1000, service: "Liquid – general line", vt: 0, sched: "40", margin: 10,
});
const nps = r.outputs.find((o) => o.label.indexOf("Recommended") === 0).value;
ok("pipe picks a real NPS", PET.standards.PIPE.some((p) => p.nps === nps), nps);
const idOut = r.outputs.find((o) => o.label.indexOf("Actual inside") === 0).value;
const reqId = r.outputs.find((o) => o.label.indexOf("Required inside") === 0).value;
ok("actual ID ≥ required ID", idOut >= reqId, `${idOut} vs ${reqId}`);
ok("has erosional check", r.checks.some((c) => c.label.indexOf("API RP 14E") === 0));

console.log("TOOL: pressure-loss");
r = PET.calc["pressure-loss"]({
  basis: "Volumetric", Qv: U.toBase(30, "m3/h", "volflow"), Qm: 0, rho: 1000,
  mu: 1e-3, D: 0.1, L: 100, mat: "Commercial steel", sumK: 0, dz: 0,
});
const dpTot = r.outputs.find((o) => o.label.indexOf("Total") === 0).value;
ok("pressure drop positive", dpTot > 0, dpTot);
ok("Re reported", r.outputs.some((o) => o.label.indexOf("Reynolds") === 0));

console.log("TOOL: pump-sizing (motor from NEMA list)");
r = PET.calc["pump-sizing"]({
  Qv: U.toBase(30, "m3/h", "volflow"), rho: 1000, headMode: "Differential head",
  H: 50, dP: 0, eff: 70, motorMargin: 15, npsha: 6, npshr: 3, npshMargin: 1,
});
const motor = r.outputs.find((o) => o.label.indexOf("Recommended motor") === 0).value;
ok("motor is a NEMA size", PET.standards.MOTOR_HP.includes(motor), motor);
ok("NPSH check present", r.checks.some((c) => c.label === "NPSH margin"));

console.log("TOOL: control-valve (liquid Cv)");
r = PET.calc["control-valve"]({
  phase: "Liquid", Qv: U.toBase(50, "m3/h", "volflow"), SG: 1, Pv: 3000, Pc: 22064000,
  P1: U.toBase(600, "kPa", "pressure"), P2: U.toBase(400, "kPa", "pressure"),
  FL: 0.9, targetTravel: 70,
});
const cv = r.outputs.find((o) => o.label.indexOf("Required Cv") === 0).value;
ok("liquid Cv reasonable", cv > 10 && cv < 60, cv); // ~hand calc: 50 m3/h=220gpm, dP=200kPa=29psi → Cv≈41

console.log("TOOL: psv-sizing (API 526 orifice letter)");
r = PET.calc["psv-sizing"]({
  svc: "Vapor / gas", W: U.toBase(5000, "kg/h", "massflow"), Ql: 0, T: 373.15,
  MW: 18, k: 1.3, Z: 1, SG: 1, P1: U.toBase(1100, "kPa", "pressure"),
  Pb: 101325, Kd: 0.975, Kb: 1, Kc: 1,
});
const letter = r.outputs.find((o) => o.label.indexOf("Selected API") === 0).value;
ok("PSV picks a real API letter", PET.standards.PSV_ORIFICE.some((o) => o.letter === letter), letter);

console.log("TOOL: compressor-sizing (staging)");
r = PET.calc["compressor-sizing"]({
  Qm: 1, MW: 18, P1: U.toBase(100, "kPa", "pressure"), T1: 303.15,
  P2: U.toBase(1000, "kPa", "pressure"), k: 1.3, Z: 1, effAd: 75,
  maxRatio: 3.5, maxTdis: 448.15, intercoolT: 313.15,
});
const stages = r.outputs.find((o) => o.label.indexOf("Number of stages") === 0).value;
const rStage = r.outputs.find((o) => o.label.indexOf("Ratio per stage") === 0).value;
ok("overall ratio 10, 175°C limit → 2 stages", stages === 2, stages);
ok("per-stage ratio ≤ 3.5", rStage <= 3.5 + 1e-6, rStage);
close("per-stage ratio = sqrt(10)", rStage, Math.sqrt(10), 1e-6);

console.log("TOOL: hx-design (LMTD area)");
r = PET.calc["hx-design"]({
  arr: "Counter-current", dutyMode: "Hot stream m·Cp", mh: 10, cph: 4180, Q: 0,
  Thi: 393.15, Tho: 333.15, Tci: 298.15, Tco: 323.15, Umode: "Enter value",
  service: "Water / water", Uval: 500, F: 1, margin: 15,
});
const Q = r.outputs.find((o) => o.label === "Heat duty").value;
close("HX duty = m cp dT", Q, 10 * 4180 * 60, 1e-9);
const area = r.outputs.find((o) => o.label.indexOf("Required area") === 0).value;
// LMTD: dt1=393.15-323.15=70, dt2=333.15-298.15=35 → LMTD=50.49; A=Q/(U*LMTD)
close("HX area", area, (10 * 4180 * 60) / (500 * 50.4942), 2e-3);

console.log("TOOL: hx-rating (ε-NTU)");
r = PET.calc["hx-rating"]({
  arr: "Counter-current", A: 20, U: 500, mh: 10, cph: 4180, Thi: 393.15,
  mc: 12, cpc: 4180, Tci: 298.15,
});
const eps = r.outputs.find((o) => o.label.indexOf("Effectiveness") === 0).value;
ok("0 < ε < 1", eps > 0 && eps < 1, eps);
const Tho = r.outputs.find((o) => o.label.indexOf("Hot outlet") === 0).value;
ok("hot outlet between inlets", Tho < 393.15 && Tho > 298.15, Tho);

console.log("TOOL: flare-stack");
r = PET.calc["flare-stack"]({
  W: 20, MW: 44, T: 333.15, k: 1.2, Z: 1, P: 101325, Mach: 0.5,
  LHV: 46e6, frad: 0.3, tau: 1, Kallow: 0,
});
const tip = r.outputs.find((o) => o.label.indexOf("Nearest standard") === 0).value;
ok("flare tip is a real NPS", PET.standards.PIPE.some((p) => p.nps === tip), tip);
ok("3 radiation distances", r.outputs.filter((o) => o.label.indexOf("Min distance") === 0).length === 3);

console.log("TOOL: noise + unit-conversion + steam-properties");
r = PET.calc["noise"]({ mode: "Pipe flow velocity", rho: 5, Qv: U.toBase(1000, "m3/h", "volflow"), D: 0.15 });
ok("noise returns velocity", r.outputs.some((o) => o.label === "Velocity"));
r = PET.calc["unit-conversion"]({ dim: "pressure", value: 1, from: "bar", to: "psi" });
close("unit tool bar→psi", r.outputs[0].value, 14.5038, 1e-4);
r = PET.calc["steam-properties"]({ mode: "Saturation (from pressure)", P: 10e5, T: 0 });
ok("steam tool returns Tsat", r.outputs.some((o) => o.label.indexOf("Saturation temp") === 0));

console.log("TOOL: two-phase-line");
r = PET.calc["two-phase-line"]({
  W: 5, x: 0.3, rhoL: 800, rhoG: 12, sched: "40", limit: 10000, margin: 10,
});
const tpPipe = r.outputs.find((o) => o.label.indexOf("Recommended") === 0).value;
ok("two-phase picks a real NPS", PET.standards.PIPE.some((p) => p.nps === tpPipe), tpPipe);
const rhoM = r.outputs.find((o) => o.label.indexOf("Mixture density") === 0).value;
// homogeneous: 1/(0.3/12 + 0.7/800) = 1/(0.025+0.000875)=38.65
close("homogeneous mixture density", rhoM, 1 / (0.3 / 12 + 0.7 / 800), 1e-6);
ok("two-phase has ρv² check", r.checks.some((c) => c.label.indexOf("ρv²") === 0));

console.log("TOOL: orifice-sizing (size & rate are inverse)");
r = PET.calc["orifice-sizing"]({
  mode: "Size bore for target ΔP", basis: "Mass", Qm: 10, rho: 1000,
  D: 0.1, dP: 25000, Cd: 0.61, eps: 1,
});
const bore = r.outputs.find((o) => o.label.indexOf("Required orifice bore") === 0).value;
const beta = r.outputs.find((o) => o.label.indexOf("Beta ratio") === 0).value;
ok("orifice bore < pipe ID", bore > 0 && bore < 0.1, bore);
close("beta = bore/D", beta, bore / 0.1, 1e-6);
// round-trip: feed bore back into rating mode, expect ~10 kg/s
r = PET.calc["orifice-sizing"]({
  mode: "Flow from bore & ΔP", basis: "Mass", Qm: 0, rho: 1000,
  D: 0.1, dP: 25000, d: bore, Cd: 0.61, eps: 1,
});
const qmBack = r.outputs.find((o) => o.label === "Mass flow").value;
close("orifice size/rate round-trip", qmBack, 10, 1e-3);

console.log("TOOL: tank-blanketing");
r = PET.calc["tank-blanketing"]({
  Vtank: 100, pumpOut: U.toBase(50, "m3/h", "volflow"), pumpIn: U.toBase(50, "m3/h", "volflow"),
  volatility: "Non-volatile (flash ≥ 60 °C)", Ri: 1,
});
const inBr = r.outputs.find((o) => o.label.indexOf("Total inbreathing") === 0).value * 3600; // m3/h
// liquid in 50 + thermal 4*100^0.7 = 4*25.12=100.5 → ~150.5 m3/h
close("inbreathing total", inBr, 50 + 4 * Math.pow(100, 0.7), 1e-3);

console.log("TOOL: vessel-thickness (ASME VIII UG-27 + MAWP round-trip)");
r = PET.calc["vessel-thickness"]({
  comp: "Cylindrical shell", P: U.toBase(1000, "kPa", "pressure"), D: 1.5,
  S: U.toBase(138, "MPa", "pressure"), E: 1.0, CA: 0.003,
});
const tReq = r.outputs.find((o) => o.label.indexOf("Required thickness (no CA)") === 0).value;
// t = P R/(SE-0.6P) = 1e6*0.75/(138e6 - 0.6e6) = 750000/137.4e6 = 0.005459 m
close("shell thickness UG-27", tReq, (1e6 * 0.75) / (138e6 - 0.6 * 1e6), 1e-6);
const mawp = r.outputs.find((o) => o.label.indexOf("MAWP") === 0).value;
close("MAWP back-calc ≈ design P", mawp, 1e6, 2e-2);
ok("thin-wall check present", r.checks.some((c) => c.label.indexOf("Thin-wall") === 0));

console.log("TOOL: properties (constants + Antoine self-consistency)");
// MW & ideal-gas density for water vapor at 100 kPa, 200°C
r = PET.calc["properties"]({ sub: "Water", T: 473.15, P: 100000 });
const mw = r.outputs.find((o) => o.label === "Molecular weight").value; // kg/mol
close("water MW", mw * 1000, 18.015, 1e-3);
const rhoIG = r.outputs.find((o) => o.label.indexOf("Ideal-gas density") === 0).value;
close("ideal-gas density P·M/RT", rhoIG, (100000 * 0.018015) / (8.314462 * 473.15), 1e-6);
// Antoine self-consistency: Pvap at each fluid's NBP must be ≈ 1 atm (760 mmHg)
const fluidsWithAntoine = ["Water", "Ammonia", "Propane", "n-Butane", "Methanol", "Ethanol", "Acetone", "Benzene", "Toluene", "n-Pentane", "n-Hexane"];
fluidsWithAntoine.forEach((name) => {
  // read NBP from the tool, then evaluate Pvap at NBP
  let rr = PET.calc["properties"]({ sub: name, T: 298.15, P: 101325 });
  const nbpK = rr.outputs.find((o) => o.label === "Normal boiling point").value;
  rr = PET.calc["properties"]({ sub: name, T: nbpK - 0.01, P: 101325 });
  const pv = rr.outputs.find((o) => o.label.indexOf("Vapor pressure") === 0);
  ok(`Antoine(${name}) → ~1 atm at NBP`, pv && Math.abs(pv.value - 101325) / 101325 < 0.02,
    pv ? (pv.value / 1000).toFixed(1) + " kPa" : "no Pvap");
});
// supercritical fluid: methane at 25°C has no vapor pressure, flags supercritical
r = PET.calc["properties"]({ sub: "Methane", T: 298.15, P: 101325 });
ok("methane @25°C flagged supercritical", r.checks.some((c) => c.label === "Supercritical"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
