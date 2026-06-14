/* steam.js — water/steam properties via the IAPWS-IF97 industrial formulation.
 * Implements Region 1 (compressed liquid), Region 2 (superheated vapor) and
 * Region 4 (saturation line). Internally works in MPa, K and kJ; the public
 * functions take/return SI (Pa, K, J/kg, J/kg·K). Validated against the IF97
 * reference points in tests/steam.test.js.
 * Ref: IAPWS R7-97(2012), "Revised Release on the IF97 Formulation". */
(function (global) {
  const PET = global.PET || (global.PET = {});
  const R = 0.461526; // kJ/(kg·K)

  // ---------------- Region 1 (compressed liquid) ----------------
  const I1 = [0,0,0,0,0,0,0,0,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,5,8,8,21,23,29,30,31,32];
  const J1 = [-2,-1,0,1,2,3,4,5,-9,-7,-1,0,1,3,-3,0,1,3,17,-4,0,6,-5,-2,10,-8,-11,-6,-29,-31,-38,-39,-40,-41];
  const n1 = [0.14632971213167,-0.84548187169114,-3.756360367204,3.3855169168385,-0.95791963387872,
    0.15772038513228,-0.016616417199501,0.00081214629983568,0.00028319080123804,-0.00060706301565874,
    -0.018990068218419,-0.032529748770505,-0.021841717175414,-0.00005283835796993,-0.00047184321073267,
    -0.00030001780793026,0.000047661393906987,-0.0000044141845330846,-7.2694996297594e-16,
    -0.000031679644845054,-0.0000028270797985312,-8.5205128120103e-10,-0.0000022425281908,
    -0.00000065171222895601,-1.4341729937924e-13,-0.00000040516996860117,-0.0000000012734301741641,
    -0.00000000017424871230634,-6.8762131295531e-19,1.4478307828521e-18,2.6335781662795e-23,
    -1.1947622640071e-23,1.8228094581404e-24,-9.3537087292458e-26];

  function region1(P, T) { // P MPa, T K
    const pi = P / 16.53, tau = 1386 / T;
    let g = 0, gp = 0, gt = 0, gtt = 0;
    for (let i = 0; i < n1.length; i++) {
      const a = Math.pow(7.1 - pi, I1[i]), b = Math.pow(tau - 1.222, J1[i]);
      g += n1[i] * a * b;
      gp += -n1[i] * I1[i] * Math.pow(7.1 - pi, I1[i] - 1) * b;
      gt += n1[i] * a * J1[i] * Math.pow(tau - 1.222, J1[i] - 1);
      gtt += n1[i] * a * J1[i] * (J1[i] - 1) * Math.pow(tau - 1.222, J1[i] - 2);
    }
    return {
      v: (R * T / (P * 1000)) * pi * gp, // m3/kg (P*1000 -> kPa so R in kJ works)
      h: R * T * tau * gt,
      s: R * (tau * gt - g),
      cp: -R * tau * tau * gtt,
    };
  }

  // ---------------- Region 2 (superheated vapor) ----------------
  const J0 = [0,1,-5,-4,-3,-2,-1,2,3];
  const n0 = [-9.6927686500217,10.086655968018,-0.005608791128302,0.071452738081455,
    -0.40710498223928,1.4240819171444,-4.383951131945,-0.28408632460772,0.021268463753307];
  const Ir = [1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,5,6,6,6,7,7,7,8,8,9,10,10,10,16,16,18,20,20,20,21,22,23,24,24,24];
  const Jr = [0,1,2,3,6,1,2,4,7,36,0,1,3,6,35,1,2,3,7,3,16,35,0,11,25,8,36,13,4,10,14,29,50,57,20,35,48,21,53,39,26,40,58];
  const nr = [-0.0017731742473213,-0.017834862292358,-0.045996013696365,-0.057581259083432,-0.05032527872793,
    -0.000033032641670203,-0.00018948987516315,-0.0039392777243355,-0.043797295650573,-0.000026674547914087,
    2.0481737692309e-8,4.3870667284435e-7,-0.00003227767723857,-0.0015033924542148,-0.040668253562649,
    -7.8847309559367e-10,1.2790717852285e-8,4.8225372718507e-7,2.2922076337661e-6,-1.6714766451061e-11,
    -0.0021171472321355,-23.895741934104,-5.905956432427e-18,-1.2621808899101e-6,-0.038946842435739,
    1.1256211360459e-11,-8.2311340897998,1.9809712802088e-8,1.0406965210174e-19,-1.0234747095929e-13,
    -1.0018179379511e-9,-8.0882908646985e-11,0.10693031879409,-0.33662250574171,8.9185845355421e-25,
    3.0629316876232e-13,-0.0000042002467698208,-5.9056029685639e-26,0.0000037826947613457,-1.2768608934681e-15,
    7.3087610595061e-29,5.5414715350778e-17,-9.436970724121e-7];

  function region2(P, T) { // P MPa, T K
    const pi = P, tau = 540 / T;
    // ideal-gas part
    let g0 = Math.log(pi), g0t = 0, g0tt = 0;
    for (let i = 0; i < n0.length; i++) {
      g0 += n0[i] * Math.pow(tau, J0[i]);
      g0t += n0[i] * J0[i] * Math.pow(tau, J0[i] - 1);
      g0tt += n0[i] * J0[i] * (J0[i] - 1) * Math.pow(tau, J0[i] - 2);
    }
    const g0p = 1 / pi;
    // residual part
    let gr = 0, grp = 0, grt = 0, grtt = 0;
    for (let i = 0; i < nr.length; i++) {
      const pp = Math.pow(pi, Ir[i]), tt = Math.pow(tau - 0.5, Jr[i]);
      gr += nr[i] * pp * tt;
      grp += nr[i] * Ir[i] * Math.pow(pi, Ir[i] - 1) * tt;
      grt += nr[i] * pp * Jr[i] * Math.pow(tau - 0.5, Jr[i] - 1);
      grtt += nr[i] * pp * Jr[i] * (Jr[i] - 1) * Math.pow(tau - 0.5, Jr[i] - 2);
    }
    return {
      v: (R * T / (P * 1000)) * pi * (g0p + grp),
      h: R * T * tau * (g0t + grt),
      s: R * (tau * (g0t + grt) - (g0 + gr)),
      cp: -R * tau * tau * (g0tt + grtt),
    };
  }

  // ---------------- Region 4 (saturation line) ----------------
  const n4 = [0,1167.0521452767,-724213.16703206,-17.073846940092,12020.82470247,
    -3232555.0322333,14.91510861353,-4823.2657361591,405113.40542057,-0.23855557567849,650.17534844798];

  function psat(T) { // K -> MPa
    const th = T + n4[9] / (T - n4[10]);
    const A = th * th + n4[1] * th + n4[2];
    const B = n4[3] * th * th + n4[4] * th + n4[5];
    const C = n4[6] * th * th + n4[7] * th + n4[8];
    return Math.pow(2 * C / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
  }
  function tsat(P) { // MPa -> K
    const be = Math.pow(P, 0.25);
    const E = be * be + n4[3] * be + n4[6];
    const F = n4[1] * be * be + n4[4] * be + n4[7];
    const G = n4[2] * be * be + n4[5] * be + n4[8];
    const Dd = 2 * G / (-F - Math.sqrt(F * F - 4 * E * G));
    return (n4[10] + Dd - Math.sqrt((n4[10] + Dd) * (n4[10] + Dd) - 4 * (n4[9] + n4[10] * Dd))) / 2;
  }

  /* ---- public SI API (Pa, K, J/kg, J/(kg·K), kg/m3) ---- */
  function props(P_Pa, T_K) {
    const P = P_Pa / 1e6;
    const Ps = (T_K >= 273.15 && T_K <= 647.096) ? psat(T_K) : null;
    let region, r, phase;
    if (T_K <= 623.15 && Ps !== null && P >= Ps) {
      region = 1; r = region1(P, T_K); phase = "compressed liquid";
    } else {
      region = 2; r = region2(P, T_K);
      phase = (Ps !== null && P < Ps) ? "superheated vapor" : "vapor";
    }
    return {
      region, phase,
      v: r.v, rho: 1 / r.v,
      h: r.h * 1000, s: r.s * 1000, cp: r.cp * 1000,
      Psat: Ps !== null ? Ps * 1e6 : null, Tsat: tsat(P),
    };
  }

  /** Saturation properties at a given pressure (Pa). */
  function saturation(P_Pa) {
    const P = P_Pa / 1e6;
    const T = tsat(P);
    const liq = region1(P, T), vap = region2(P, T);
    return {
      Tsat: T, P: P_Pa,
      liquid: { v: liq.v, rho: 1 / liq.v, h: liq.h * 1000, s: liq.s * 1000 },
      vapor: { v: vap.v, rho: 1 / vap.v, h: vap.h * 1000, s: vap.s * 1000 },
      hfg: (vap.h - liq.h) * 1000, // latent heat J/kg
    };
  }

  PET.steam = { props, saturation, psat: (T) => psat(T) * 1e6, tsat: (P) => tsat(P / 1e6) };
  if (typeof module !== "undefined" && module.exports) module.exports = PET.steam;
})(typeof window !== "undefined" ? window : globalThis);
