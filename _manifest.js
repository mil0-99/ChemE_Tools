/* _manifest.js — the list of tool files to load, in order.
 *
 * TO ADD A NEW TOOL:
 *   1. Drop your file in this folder (js/tools/), e.g. "my-tool.js".
 *   2. Add its filename to the array below.
 * That's it — index.html never needs to change.
 *
 * Each tool file registers itself with PET.registerTool({...}); see any
 * existing tool for the pattern. Tools appear in the sidebar grouped by their
 * `category`, in the order listed here.
 */
window.PET = window.PET || {};
PET.TOOL_FILES = [
  "basic.js",          // Unit Conversion, Pipe Sizing
  "hydraulics.js",     // Pressure Loss, Pump Sizing
  "two-phase.js",      // Two-Phase Line Sizing
  "valves.js",         // Control Valve, PSV
  "orifice.js",        // Orifice / Flow-meter Sizing
  "compressor.js",     // Compressor Sizing
  "heat-exchanger.js", // HX Design, HX Rating
  "flare-noise.js",    // Flare Stack, Noise
  "steam-tool.js",     // Steam Properties
  "tank-blanketing.js",// Tank Blanketing / Venting
  "vessel-thickness.js",// Vessel Wall Thickness
];
