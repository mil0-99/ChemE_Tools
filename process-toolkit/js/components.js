/* components.js — Shared chemical component database for ChemETools.
 *
 * Consumed by:
 *   • PET calculation tools  → via PET.components
 *   • Flowsheet simulator    → via window.CET_COMPONENTS / window.CET_NRTL
 *
 * Field legend:
 *   MW      g/mol
 *   CpL     liquid heat capacity  J/(mol·K)
 *   CpV     ideal-gas Cp          J/(mol·K)
 *   Hvap    molar heat of vap.    J/mol  (at ~NBP)
 *   A,B,C   Antoine constants     log10(P_mmHg) = A − B/(C + T_°C)
 *   Tb      normal boiling pt     °C
 *   Tc      critical temperature  K
 *   Pc      critical pressure     Pa
 *   w       acentric factor
 *   rhoL    liquid density ref    kg/m³  (null for permanent gases)
 *   rhoT    reference temperature °C for rhoL
 *   Tmin    Antoine lower limit   °C  (null if not well-established)
 *   Tmax    Antoine upper limit   °C
 *
 * Antoine constants verified to reproduce NBP ≤ 0.5%.
 * Sources: Poling, Prausnitz & O'Connell — "The Properties of Gases and
 *   Liquids", 5th ed.; Perry's Chemical Engineers' Handbook; NIST WebBook.
 */
(function (global) {
  const PET = global.PET || (global.PET = {});

  const COMPONENTS = {

    // ── Non-condensable / special ──────────────────────────────────────────
    Air: {
      MW:28.97, CpL:null,  CpV:29.1, Hvap:null,
      A:null,  B:null,    C:null,    Tb:-194.4,
      Tc:132.5,  Pc:37.7e5,  w:0.000,
      rhoL:null, rhoT:null, Tmin:null, Tmax:null,
    },

    // ── Light gases / inerts ───────────────────────────────────────────────
    Hydrogen: {
      MW:2.016,  CpL:28.8,  CpV:28.8,  Hvap:904,
      A:5.92088, B:71.6153, C:276.34,   Tb:-252.8,
      Tc:33.2,   Pc:12.97e5, w:-0.216,
      rhoL:71,   rhoT:-253,  Tmin:null, Tmax:null,
    },
    Nitrogen: {
      MW:28.01,  CpL:29.1,  CpV:29.1,  Hvap:5577,
      A:6.49457, B:255.680, C:266.550,  Tb:-195.8,
      Tc:126.2,  Pc:33.98e5, w:0.038,
      rhoL:807,  rhoT:-196,  Tmin:null, Tmax:null,
    },
    Oxygen: {
      MW:32.00,  CpL:29.4,  CpV:29.4,  Hvap:6820,
      A:6.69147, B:319.013, C:266.697,  Tb:-183,
      Tc:154.6,  Pc:50.43e5, w:0.022,
      rhoL:1141, rhoT:-183,  Tmin:null, Tmax:null,
    },
    CO2: {
      MW:44.01,  CpL:37.1,  CpV:37.1,  Hvap:17160,
      A:9.81066, B:1347.79, C:273.00,   Tb:-78.5,
      Tc:304.1,  Pc:73.80e5, w:0.239,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    H2S: {
      MW:34.08,  CpL:34.2,  CpV:34.2,  Hvap:18670,
      A:6.08450, B:639.78,  C:260.00,   Tb:-60.3,
      Tc:373.5,  Pc:89.63e5, w:0.090,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    CO: {
      MW:28.01,  CpL:29.1,  CpV:29.1,  Hvap:6040,
      A:6.68400, B:290.900, C:268.000,  Tb:-191.5,
      Tc:132.9,  Pc:34.50e5, w:0.048,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    SO2: {
      MW:64.06,  CpL:87.0,  CpV:39.9,  Hvap:24920,
      A:7.28229, B:999.900, C:237.190,  Tb:-10.0,
      Tc:430.7,  Pc:78.84e5, w:0.251,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    Ammonia: {
      MW:17.03,  CpL:77.0,  CpV:35.6,  Hvap:23350,
      A:7.55466, B:1002.711, C:247.885, Tb:-33.35,
      Tc:405.5,  Pc:113.53e5, w:0.253,
      rhoL:682,  rhoT:-33,   Tmin:-83,  Tmax:60,
    },

    // ── Light hydrocarbons (C1–C4) ─────────────────────────────────────────
    Methane: {
      MW:16.04,  CpL:35.7,  CpV:35.7,  Hvap:8170,
      A:6.61184, B:389.93,  C:266.00,   Tb:-161.5,
      Tc:190.6,  Pc:46.00e5, w:0.011,
      rhoL:422,  rhoT:-162,  Tmin:null, Tmax:null,
    },
    Ethane: {
      MW:30.07,  CpL:52.5,  CpV:52.5,  Hvap:14690,
      A:6.80266, B:656.40,  C:256.00,   Tb:-88.6,
      Tc:305.3,  Pc:48.72e5, w:0.099,
      rhoL:544,  rhoT:-89,   Tmin:null, Tmax:null,
    },
    Ethylene: {
      MW:28.05,  CpL:42.9,  CpV:42.9,  Hvap:13540,
      A:6.74756, B:585.00,  C:255.00,   Tb:-103.7,
      Tc:282.3,  Pc:50.40e5, w:0.087,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    Propane: {
      MW:44.10,  CpL:73.6,  CpV:73.6,  Hvap:19040,
      A:6.80398, B:803.81,  C:246.99,   Tb:-42.1,
      Tc:369.8,  Pc:42.48e5, w:0.152,
      rhoL:582,  rhoT:-42,   Tmin:-108, Tmax:27,
    },
    Propylene: {
      MW:42.08,  CpL:64.3,  CpV:64.3,  Hvap:18420,
      A:6.81960, B:785.00,  C:247.00,   Tb:-47.7,
      Tc:364.9,  Pc:46.00e5, w:0.142,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    iButane: {
      MW:58.12,  CpL:96.7,  CpV:96.7,  Hvap:21300,
      A:6.74808, B:882.80,  C:240.00,   Tb:-11.7,
      Tc:407.8,  Pc:36.40e5, w:0.184,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },
    nButane: {
      MW:58.12,  CpL:98.5,  CpV:98.5,  Hvap:22440,
      A:6.80896, B:935.86,  C:238.73,   Tb:-0.5,
      Tc:425.1,  Pc:37.96e5, w:0.200,
      rhoL:573,  rhoT:25,    Tmin:-78,  Tmax:19,
    },
    iButylene: {
      MW:56.11,  CpL:90.0,  CpV:73.5,  Hvap:21920,
      A:6.52700, B:877.900, C:247.650,  Tb:-6.9,
      Tc:417.9,  Pc:40.00e5, w:0.194,
      rhoL:null, rhoT:null,  Tmin:null, Tmax:null,
    },

    // ── C5–C10 n-alkanes & isomers ─────────────────────────────────────────
    iPentane: {
      MW:72.15,  CpL:118.0, CpV:118.0, Hvap:24690,
      A:6.78967, B:1020.01, C:233.10,   Tb:27.8,
      Tc:460.4,  Pc:33.81e5, w:0.227,
      rhoL:616,  rhoT:25,    Tmin:null, Tmax:null,
    },
    nPentane: {
      MW:72.15,  CpL:120.0, CpV:120.0, Hvap:25790,
      A:6.87632, B:1075.78, C:233.205,  Tb:36.1,
      Tc:469.7,  Pc:33.70e5, w:0.252,
      rhoL:621,  rhoT:25,    Tmin:-50,  Tmax:58,
    },
    nHexane: {
      MW:86.18,  CpL:195.0, CpV:143.0, Hvap:28850,
      A:6.87601, B:1171.170, C:224.410, Tb:68.7,
      Tc:507.6,  Pc:30.25e5, w:0.301,
      rhoL:655,  rhoT:25,    Tmin:-25,  Tmax:92,
    },
    nHeptane: {
      MW:100.2,  CpL:224.6, CpV:165.0, Hvap:31770,
      A:6.89385, B:1264.370, C:216.640, Tb:98.4,
      Tc:540.2,  Pc:27.40e5, w:0.350,
      rhoL:684,  rhoT:25,    Tmin:null, Tmax:null,
    },
    nOctane: {
      MW:114.2,  CpL:254.6, CpV:188.0, Hvap:34410,
      A:6.92377, B:1355.13, C:209.52,   Tb:125.7,
      Tc:568.7,  Pc:24.90e5, w:0.399,
      rhoL:699,  rhoT:25,    Tmin:null, Tmax:null,
    },
    nNonane: {
      MW:128.26, CpL:285.0, CpV:211.0, Hvap:36910,
      A:6.93520, B:1429.497, C:202.085, Tb:150.8,
      Tc:594.6,  Pc:22.90e5, w:0.443,
      rhoL:718,  rhoT:25,    Tmin:null, Tmax:null,
    },
    nDecane: {
      MW:142.29, CpL:315.0, CpV:233.0, Hvap:38750,
      A:6.95367, B:1503.568, C:194.738, Tb:174.1,
      Tc:617.7,  Pc:21.10e5, w:0.489,
      rhoL:730,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Cyclohexane: {
      MW:84.16,  CpL:156.0, CpV:106.0, Hvap:29970,
      A:6.84130, B:1201.53, C:222.65,   Tb:80.7,
      Tc:553.6,  Pc:40.73e5, w:0.212,
      rhoL:779,  rhoT:25,    Tmin:null, Tmax:null,
    },

    // ── Aromatics (BTX / petrochemical) ───────────────────────────────────
    Benzene: {
      MW:78.11,  CpL:136.0, CpV:82.4,  Hvap:30720,
      A:6.90565, B:1211.033, C:220.790, Tb:80.1,
      Tc:562.05, Pc:48.95e5, w:0.210,
      rhoL:874,  rhoT:25,    Tmin:8,    Tmax:103,
    },
    Toluene: {
      MW:92.14,  CpL:157.0, CpV:103.0, Hvap:33180,
      A:6.95464, B:1344.800, C:219.482, Tb:110.6,
      Tc:591.8,  Pc:41.06e5, w:0.264,
      rhoL:865,  rhoT:25,    Tmin:6,    Tmax:137,
    },
    oXylene: {
      MW:106.17, CpL:187.0, CpV:133.0, Hvap:36240,
      A:6.99891, B:1474.679, C:213.686, Tb:144.4,
      Tc:630.3,  Pc:37.34e5, w:0.310,
      rhoL:880,  rhoT:25,    Tmin:null, Tmax:null,
    },
    mXylene: {
      MW:106.17, CpL:184.5, CpV:132.0, Hvap:35480,
      A:7.00908, B:1462.266, C:215.110, Tb:139.1,
      Tc:617.0,  Pc:35.36e5, w:0.326,
      rhoL:864,  rhoT:25,    Tmin:null, Tmax:null,
    },
    pXylene: {
      MW:106.17, CpL:183.7, CpV:130.3, Hvap:35040,
      A:6.99272, B:1453.430, C:215.307, Tb:138.3,
      Tc:616.2,  Pc:35.11e5, w:0.322,
      rhoL:861,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Ethylbenzene: {
      MW:106.17, CpL:183.2, CpV:128.3, Hvap:35570,
      A:6.95641, B:1424.255, C:213.206, Tb:136.2,
      Tc:617.2,  Pc:36.09e5, w:0.302,
      rhoL:867,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Styrene: {
      MW:104.15, CpL:182.0, CpV:122.0, Hvap:36000,
      A:6.95800, B:1445.580, C:209.440, Tb:145.2,
      Tc:636.0,  Pc:38.40e5, w:0.297,
      rhoL:906,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Cumene: {
      MW:120.19, CpL:214.4, CpV:155.0, Hvap:37530,
      A:6.99500, B:1491.280, C:210.100, Tb:152.4,
      Tc:631.1,  Pc:32.09e5, w:0.329,
      rhoL:862,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Naphthalene: {
      MW:128.17, CpL:196.0, CpV:132.0, Hvap:43235,
      A:7.01036, B:1733.710, C:201.860, Tb:218.0,
      Tc:748.4,  Pc:40.51e5, w:0.302,
      rhoL:976,  rhoT:100,   Tmin:null, Tmax:null,
    },

    // ── Oxygenates / polar ────────────────────────────────────────────────
    Methanol: {
      MW:32.04,  CpL:81.1,  CpV:44.0,  Hvap:35210,
      A:8.08097, B:1582.27, C:239.726,  Tb:64.7,
      Tc:512.6,  Pc:80.97e5, w:0.565,
      rhoL:792,  rhoT:25,    Tmin:-16,  Tmax:91,
    },
    Ethanol: {
      MW:46.07,  CpL:112.3, CpV:65.6,  Hvap:38560,
      A:8.20417, B:1642.89, C:230.300,  Tb:78.4,
      Tc:514.0,  Pc:61.37e5, w:0.644,
      rhoL:789,  rhoT:25,    Tmin:-2,   Tmax:100,
    },
    Acetone: {
      MW:58.08,  CpL:125.5, CpV:75.0,  Hvap:29100,
      A:7.11714, B:1210.595, C:229.664, Tb:56.1,
      Tc:508.1,  Pc:47.01e5, w:0.307,
      rhoL:784,  rhoT:25,    Tmin:-13,  Tmax:55,
    },
    Water: {
      MW:18.02,  CpL:75.3,  CpV:33.6,  Hvap:40660,
      A:8.07131, B:1730.63, C:233.426,  Tb:100,
      Tc:647.1,  Pc:220.6e5, w:0.345,
      rhoL:997,  rhoT:25,    Tmin:1,    Tmax:100,
    },
    nPropanol: {
      MW:60.10,  CpL:143.7, CpV:86.0,  Hvap:41440,
      A:7.99733, B:1569.693, C:209.529, Tb:97.1,
      Tc:536.8,  Pc:51.75e5, w:0.624,
      rhoL:804,  rhoT:25,    Tmin:null, Tmax:null,
    },
    IPA: {
      MW:60.10,  CpL:154.4, CpV:88.0,  Hvap:44000,
      A:8.11778, B:1580.920, C:219.610, Tb:82.3,
      Tc:508.3,  Pc:47.62e5, w:0.670,
      rhoL:786,  rhoT:25,    Tmin:null, Tmax:null,
    },
    nButanol: {
      MW:74.12,  CpL:177.2, CpV:110.5, Hvap:43290,
      A:7.82934, B:1558.190, C:196.880, Tb:117.7,
      Tc:563.1,  Pc:44.23e5, w:0.590,
      rhoL:810,  rhoT:25,    Tmin:null, Tmax:null,
    },

    // ── Solvents (acids / esters / ethers / ketones / aldehydes) ──────────
    AceticAcid: {
      MW:60.05,  CpL:123.4, CpV:63.8,  Hvap:23700,
      A:7.38782, B:1533.313, C:222.309, Tb:118.1,
      Tc:591.9,  Pc:57.86e5, w:0.467,
      rhoL:1049, rhoT:25,    Tmin:null, Tmax:null,
    },
    EthylAcetate: {
      MW:88.11,  CpL:169.0, CpV:116.0, Hvap:31945,
      A:7.09808, B:1238.710, C:217.000, Tb:77.1,
      Tc:523.3,  Pc:38.30e5, w:0.363,
      rhoL:897,  rhoT:25,    Tmin:null, Tmax:null,
    },
    MEK: {
      MW:72.11,  CpL:158.7, CpV:103.0, Hvap:31600,
      A:7.06356, B:1261.340, C:221.969, Tb:79.6,
      Tc:535.5,  Pc:42.05e5, w:0.322,
      rhoL:805,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Diethylether: {
      MW:74.12,  CpL:172.5, CpV:120.0, Hvap:26520,
      A:6.78882, B:994.195, C:220.000,  Tb:34.5,
      Tc:466.7,  Pc:36.38e5, w:0.281,
      rhoL:708,  rhoT:25,    Tmin:null, Tmax:null,
    },
    Acetaldehyde: {
      MW:44.05,  CpL:89.0,  CpV:54.3,  Hvap:25470,
      A:6.76800, B:988.000, C:234.000,  Tb:20.2,
      Tc:461.0,  Pc:55.70e5, w:0.291,
      rhoL:788,  rhoT:20,    Tmin:null, Tmax:null,
    },

    // ── Halogenated solvents ───────────────────────────────────────────────
    Chloroform: {
      MW:119.38, CpL:116.3, CpV:65.7,  Hvap:29240,
      A:6.91100, B:1163.030, C:227.400, Tb:61.2,
      Tc:536.4,  Pc:55.30e5, w:0.218,
      rhoL:1489, rhoT:25,    Tmin:null, Tmax:null,
    },
    DCM: {
      MW:84.93,  CpL:101.2, CpV:51.3,  Hvap:28060,
      A:6.83000, B:1057.550, C:228.200, Tb:39.6,
      Tc:510.0,  Pc:60.80e5, w:0.199,
      rhoL:1325, rhoT:25,    Tmin:null, Tmax:null,
    },
    VCM: {
      MW:62.50,  CpL:86.8,  CpV:53.7,  Hvap:20900,
      A:6.74400, B:887.920, C:243.200,  Tb:-13.4,
      Tc:429.7,  Pc:56.00e5, w:0.100,
      rhoL:910,  rhoT:-13,   Tmin:null, Tmax:null,
    },
  };

  // NRTL binary interaction parameters [A12, A21, alpha] in cal/mol.
  // Unknown pairs default to ideal (A12=A21=0).
  const NRTL = {
    // alcohols / water (strongly non-ideal, azeotropes)
    'Ethanol|Water':    {A12:-109.6, A21:1332.3, alpha:0.303},
    'Methanol|Water':   {A12:-50.0,  A21:580.0,  alpha:0.300},
    'Acetone|Water':    {A12:631.0,  A21:1197.0, alpha:0.539},
    'Ethanol|Benzene':  {A12:1264.0, A21:336.0,  alpha:0.470},
    'Methanol|Benzene': {A12:1666.0, A21:730.0,  alpha:0.470},
    'Benzene|Toluene':  {A12:0,      A21:0,      alpha:0.300},
    'nHexane|Benzene':  {A12:455.0,  A21:38.0,   alpha:0.470},
    'nHexane|nHeptane': {A12:0,      A21:0,      alpha:0.300},
    'Acetone|Methanol': {A12:184.0,  A21:222.0,  alpha:0.300},
    // hydrocarbon / water — near-immiscible, large positive deviations
    'nHexane|Water':    {A12:3000.0, A21:1500.0, alpha:0.200},
    'nHeptane|Water':   {A12:3100.0, A21:1550.0, alpha:0.200},
    'nOctane|Water':    {A12:3200.0, A21:1600.0, alpha:0.200},
    'Benzene|Water':    {A12:2133.0, A21:1310.0, alpha:0.200},
    'Toluene|Water':    {A12:2400.0, A21:1400.0, alpha:0.200},
    'Cyclohexane|Water':{A12:3050.0, A21:1520.0, alpha:0.200},
    'nPentane|Water':   {A12:2900.0, A21:1450.0, alpha:0.200},
    // acid gases / water
    'CO2|Water':        {A12:1200.0, A21:600.0,  alpha:0.300},
    'H2S|Water':        {A12:900.0,  A21:450.0,  alpha:0.300},
    'CO2|Methanol':     {A12:350.0,  A21:120.0,  alpha:0.300},
    // alcohol / hydrocarbon
    'Methanol|nHexane': {A12:1450.0, A21:1080.0, alpha:0.430},
    'Ethanol|nHexane':  {A12:1100.0, A21:920.0,  alpha:0.440},
  };

  PET.components = COMPONENTS;
  PET.nrtl       = NRTL;
  global.CET_COMPONENTS = COMPONENTS;
  global.CET_NRTL       = NRTL;

})(typeof window !== "undefined" ? window : globalThis);
