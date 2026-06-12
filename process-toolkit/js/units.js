/* units.js — dimensional unit-conversion engine.
 * Each unit stores {s: scale, o: offset} relative to an SI base, so
 *   base_value = value * s + o      (offset handles temperature & gauge pressure)
 *   value      = (base_value - o) / s
 * Specific gravity / API are handled with custom transforms.
 */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const PATM = 101325; // Pa, reference atmospheric pressure for gauge units

  // dimension -> { base, units: { name: {s, o, label} } }
  const D = {
    length: {
      base: "m",
      units: {
        m: { s: 1 }, cm: { s: 0.01 }, mm: { s: 1e-3 }, km: { s: 1000 },
        in: { s: 0.0254 }, ft: { s: 0.3048 }, yd: { s: 0.9144 }, mi: { s: 1609.344 },
      },
    },
    area: {
      base: "m2",
      units: {
        m2: { s: 1 }, cm2: { s: 1e-4 }, mm2: { s: 1e-6 },
        in2: { s: 6.4516e-4 }, ft2: { s: 0.09290304 },
      },
    },
    volume: {
      base: "m3",
      units: {
        m3: { s: 1 }, L: { s: 1e-3 }, mL: { s: 1e-6 }, cm3: { s: 1e-6 },
        ft3: { s: 0.0283168466 }, in3: { s: 1.6387064e-5 },
        "gal(US)": { s: 3.785411784e-3 }, bbl: { s: 0.158987295 },
      },
    },
    mass: {
      base: "kg",
      units: {
        kg: { s: 1 }, g: { s: 1e-3 }, tonne: { s: 1000 },
        lb: { s: 0.45359237 }, oz: { s: 0.028349523 }, "ton(US)": { s: 907.18474 },
      },
    },
    time: {
      base: "s",
      units: { s: { s: 1 }, min: { s: 60 }, h: { s: 3600 }, day: { s: 86400 } },
    },
    velocity: {
      base: "m/s",
      units: {
        "m/s": { s: 1 }, "ft/s": { s: 0.3048 }, "ft/min": { s: 0.3048 / 60 },
        "km/h": { s: 1 / 3.6 }, "mph": { s: 0.44704 },
      },
    },
    volflow: {
      base: "m3/s",
      units: {
        "m3/s": { s: 1 }, "m3/h": { s: 1 / 3600 }, "L/s": { s: 1e-3 },
        "L/min": { s: 1e-3 / 60 }, "L/h": { s: 1e-3 / 3600 },
        "gpm(US)": { s: 6.30901964e-5 }, "ft3/s": { s: 0.0283168466 },
        "ft3/min": { s: 0.0283168466 / 60 }, "bbl/day": { s: 1.84013e-6 },
      },
    },
    massflow: {
      base: "kg/s",
      units: {
        "kg/s": { s: 1 }, "kg/h": { s: 1 / 3600 }, "g/s": { s: 1e-3 },
        "lb/s": { s: 0.45359237 }, "lb/h": { s: 0.45359237 / 3600 },
        "tonne/h": { s: 1000 / 3600 }, "ton(US)/day": { s: 907.18474 / 86400 },
      },
    },
    pressure: {
      base: "Pa",
      units: {
        Pa: { s: 1 }, kPa: { s: 1000 }, MPa: { s: 1e6 }, bar: { s: 1e5 },
        psi: { s: 6894.757293 }, atm: { s: 101325 },
        mmHg: { s: 133.322368 }, inHg: { s: 3386.389 },
        inH2O: { s: 249.0889 }, "kgf/cm2": { s: 98066.5 },
        // gauge variants (offset = +1 atm to reach absolute)
        "psig": { s: 6894.757293, o: PATM }, "barg": { s: 1e5, o: PATM },
        "kPaG": { s: 1000, o: PATM }, "kgf/cm2(g)": { s: 98066.5, o: PATM },
      },
    },
    temperature: {
      base: "K",
      units: {
        K: { s: 1 }, "°C": { s: 1, o: 273.15 },
        "°F": { s: 5 / 9, o: 273.15 - 32 * 5 / 9 }, "°R": { s: 5 / 9 },
      },
    },
    density: {
      base: "kg/m3",
      units: {
        "kg/m3": { s: 1 }, "g/cm3": { s: 1000 }, "g/mL": { s: 1000 },
        "lb/ft3": { s: 16.0184634 }, "lb/gal(US)": { s: 119.826427 },
        "SG": { s: 1000 }, // specific gravity relative to water (1000 kg/m3)
      },
    },
    dynviscosity: {
      base: "Pa·s",
      units: {
        "Pa·s": { s: 1 }, "mPa·s": { s: 1e-3 }, cP: { s: 1e-3 },
        "lb/(ft·s)": { s: 1.488164 }, "lb/(ft·h)": { s: 1.488164 / 3600 },
      },
    },
    kinviscosity: {
      base: "m2/s",
      units: { "m2/s": { s: 1 }, cSt: { s: 1e-6 }, "mm2/s": { s: 1e-6 }, "ft2/s": { s: 0.09290304 } },
    },
    power: {
      base: "W",
      units: {
        W: { s: 1 }, kW: { s: 1000 }, MW: { s: 1e6 }, hp: { s: 745.699872 },
        "BTU/h": { s: 0.29307107 }, "MMBTU/h": { s: 293071.07 }, "kcal/h": { s: 1.163 },
      },
    },
    energy: {
      base: "J",
      units: {
        J: { s: 1 }, kJ: { s: 1000 }, MJ: { s: 1e6 }, kWh: { s: 3.6e6 },
        BTU: { s: 1055.05585 }, cal: { s: 4.184 }, kcal: { s: 4184 },
      },
    },
    spec_energy: { // enthalpy / latent heat per mass
      base: "J/kg",
      units: { "J/kg": { s: 1 }, "kJ/kg": { s: 1000 }, "BTU/lb": { s: 2326 }, "kcal/kg": { s: 4184 } },
    },
    spec_heat: {
      base: "J/(kg·K)",
      units: { "J/(kg·K)": { s: 1 }, "kJ/(kg·K)": { s: 1000 }, "BTU/(lb·°F)": { s: 4186.8 }, "cal/(g·°C)": { s: 4184 } },
    },
    conductivity: {
      base: "W/(m·K)",
      units: { "W/(m·K)": { s: 1 }, "BTU/(h·ft·°F)": { s: 1.730735 }, "kcal/(h·m·°C)": { s: 1.163 } },
    },
    htc: { // heat-transfer coefficient (U)
      base: "W/(m2·K)",
      units: { "W/(m2·K)": { s: 1 }, "BTU/(h·ft2·°F)": { s: 5.678263 }, "kcal/(h·m2·°C)": { s: 1.163 } },
    },
    molarmass: {
      base: "kg/mol",
      units: { "g/mol": { s: 1e-3 }, "kg/kmol": { s: 1e-3 }, "kg/mol": { s: 1 }, "lb/lbmol": { s: 1e-3 } },
    },
    dimensionless: { base: "-", units: { "-": { s: 1 } } },
  };

  function toBase(value, unit, dim) {
    const u = D[dim].units[unit];
    if (!u) throw new Error(`Unknown unit '${unit}' for ${dim}`);
    return value * u.s + (u.o || 0);
  }
  function fromBase(base, unit, dim) {
    const u = D[dim].units[unit];
    if (!u) throw new Error(`Unknown unit '${unit}' for ${dim}`);
    return (base - (u.o || 0)) / u.s;
  }
  function convert(value, fromUnit, toUnit, dim) {
    return fromBase(toBase(value, fromUnit, dim), toUnit, dim);
  }
  function unitList(dim) {
    return Object.keys(D[dim].units);
  }
  function baseUnit(dim) {
    return D[dim].base;
  }

  PET.units = { D, toBase, fromBase, convert, unitList, baseUnit, PATM };
  if (typeof module !== "undefined" && module.exports) module.exports = PET.units;
})(typeof window !== "undefined" ? window : globalThis);
