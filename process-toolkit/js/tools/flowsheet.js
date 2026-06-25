/* tools/flowsheet.js — Flowsheet Simulator tool registration.
 * This is an "embed" tool: selecting it replaces the main panel with
 * a full-height iframe pointing to flowsheet.html. */
(function (global) {
  const PET = global.PET || (global.PET = {});

  PET.registerTool({
    id:       "flowsheet",
    name:     "Flowsheet Simulator",
    category: "Simulation",
    blurb:    "Steady-state sequential-modular process simulator. Build PFDs with drag-and-drop, connect streams, specify feed conditions, and solve material & energy balances using NRTL, Peng-Robinson, or ideal VLE.",
    type:     "embed",
    src:      "flowsheet.html",
    inputs:   [],
    compute:  () => ({ outputs: [], checks: [], notes: [], refs: [] }),
  });
})(typeof window !== "undefined" ? window : globalThis);
