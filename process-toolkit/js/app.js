/* app.js — generic UI: builds the tool list, renders input forms with per-field
 * unit dropdowns, runs compute, and renders outputs (with output-unit dropdowns),
 * status chips, notes and references. Browser-only. */
(function () {
  const PET = window.PET;
  const U = PET.units;

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  // sensible default output unit per dimension (US/metric mix common in plants)
  const PREFERRED = {
    length: "mm", area: "mm2", volflow: "m3/h", massflow: "kg/h", velocity: "m/s",
    pressure: "kPa", temperature: "°C", density: "kg/m3", power: "kW",
    spec_energy: "kJ/kg", spec_heat: "kJ/(kg·K)", htc: "W/(m2·K)", energy: "kJ",
    dynviscosity: "cP", kinviscosity: "cSt", mass: "kg", volume: "m3", time: "s",
    conductivity: "W/(m·K)", molarmass: "g/mol",
  };

  let current = null;       // active tool def
  const formState = {};     // key -> {value, unit}
  let lastResult = null;
  const outUnitState = {};  // output index -> chosen unit

  /* ---------- sidebar ---------- */
  function buildSidebar() {
    const nav = document.getElementById("toolnav");
    const cats = {};
    PET.tools.forEach((t) => { (cats[t.category] = cats[t.category] || []).push(t); });
    Object.keys(cats).sort().forEach((cat) => {
      nav.appendChild(el("div", "nav-cat", cat));
      cats[cat].forEach((t) => {
        const b = el("button", "nav-item", t.name);
        b.onclick = () => selectTool(t.id);
        b.dataset.id = t.id;
        nav.appendChild(b);
      });
    });
  }

  function selectTool(id) {
    current = PET.tools.find((t) => t.id === id);
    Object.keys(formState).forEach((k) => delete formState[k]);
    Object.keys(outUnitState).forEach((k) => delete outUnitState[k]);
    lastResult = null;
    document.querySelectorAll(".nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.id === id));
    // seed defaults
    current.inputs.forEach((inp) => {
      if (inp.type === "select") {
        const opts = typeof inp.options === "function" ? inp.options(currentValues()) : inp.options;
        formState[inp.key] = { value: inp.default !== undefined ? inp.default : opts[0] };
      } else {
        formState[inp.key] = { value: inp.default, unit: inp.defaultUnit };
      }
    });
    renderForm();
    document.getElementById("results").innerHTML =
      '<div class="placeholder">Enter values and press <b>Calculate</b>.</div>';
  }

  // current raw values (for option functions / showIf)
  function currentValues() {
    const v = {};
    current && current.inputs.forEach((i) => { v[i.key] = formState[i.key] && formState[i.key].value; });
    return v;
  }

  function visible(inp) {
    if (!inp.showIf) return true;
    const s = formState[inp.showIf.key];
    return s && s.value === inp.showIf.eq;
  }

  /* ---------- form ---------- */
  function renderForm() {
    const host = document.getElementById("toolform");
    host.innerHTML = "";
    document.getElementById("toolname").textContent = current.name;
    document.getElementById("toolblurb").textContent = current.blurb;

    current.inputs.forEach((inp) => {
      if (!visible(inp)) return;
      const row = el("div", "field");
      const lab = el("label", "field-label", inp.label + (inp.optional ? ' <span class="opt">(optional)</span>' : ""));
      row.appendChild(lab);

      const controls = el("div", "field-controls");
      if (inp.type === "select") {
        const sel = el("select", "control");
        const opts = typeof inp.options === "function" ? inp.options(currentValues()) : inp.options;
        opts.forEach((o) => {
          const op = el("option", null, o); op.value = o;
          if (formState[inp.key].value === o) op.selected = true;
          sel.appendChild(op);
        });
        sel.onchange = () => {
          formState[inp.key].value = sel.value;
          // dependent selects (e.g. unit lists tied to a dimension) must refresh
          renderForm();
        };
        controls.appendChild(sel);
      } else {
        const num = el("input", "control num");
        num.type = "number"; num.step = "any";
        num.value = formState[inp.key].value;
        num.oninput = () => { formState[inp.key].value = parseFloat(num.value); };
        controls.appendChild(num);
        if (inp.dim) {
          const usel = el("select", "control unit");
          (inp.units || U.unitList(inp.dim)).forEach((u) => {
            const op = el("option", null, u); op.value = u;
            if (formState[inp.key].unit === u) op.selected = true;
            usel.appendChild(op);
          });
          usel.onchange = () => { formState[inp.key].unit = usel.value; };
          controls.appendChild(usel);
        }
      }
      row.appendChild(controls);
      if (inp.help) row.appendChild(el("div", "field-help", inp.help));
      host.appendChild(row);
    });
  }

  /* ---------- run ---------- */
  function calculate() {
    const v = {};
    current.inputs.forEach((inp) => {
      const st = formState[inp.key];
      if (!st) return;
      if (inp.type === "select") { v[inp.key] = st.value; return; }
      const raw = parseFloat(st.value);
      v[inp.key] = inp.dim ? U.toBase(isFinite(raw) ? raw : 0, st.unit, inp.dim) : raw;
    });
    try {
      lastResult = current.compute(v);
      Object.keys(outUnitState).forEach((k) => delete outUnitState[k]);
      renderResults();
    } catch (err) {
      document.getElementById("results").innerHTML =
        '<div class="check fail"><b>Could not compute.</b> ' + (err.message || err) + "</div>";
    }
  }

  function renderResults() {
    const host = document.getElementById("results");
    host.innerHTML = "";
    const r = lastResult;

    // outputs
    const outs = el("div", "outs");
    r.outputs.forEach((o, i) => {
      const card = el("div", "out");
      card.appendChild(el("div", "out-label", o.label));
      const valWrap = el("div", "out-valwrap");
      const valSpan = el("span", "out-val");

      let unit, shown;
      if (o.fixedUnit) {
        unit = o.unit; shown = o.value;
      } else {
        unit = outUnitState[i] || o.preferUnit || PREFERRED[o.dim] || U.baseUnit(o.dim);
        shown = U.fromBase(o.value, unit, o.dim);
      }
      valSpan.textContent = PET.fmt(shown);
      valWrap.appendChild(valSpan);

      if (o.fixedUnit) {
        valWrap.appendChild(el("span", "out-unit", " " + (unit || "")));
      } else {
        const usel = el("select", "control unit out-unit-sel");
        (o.units || U.unitList(o.dim)).forEach((u) => {
          const op = el("option", null, u); op.value = u;
          if (u === unit) op.selected = true;
          usel.appendChild(op);
        });
        usel.onchange = () => { outUnitState[i] = usel.value; renderResults(); };
        valWrap.appendChild(usel);
      }
      card.appendChild(valWrap);
      if (o.hint) card.appendChild(el("div", "out-hint", o.hint));
      outs.appendChild(card);
    });
    host.appendChild(outs);

    // checks (status chips)
    if (r.checks && r.checks.length) {
      const cwrap = el("div", "checks");
      cwrap.appendChild(el("h3", "section-h", "Limit checks"));
      r.checks.forEach((c) => {
        const chip = el("div", "check " + c.status);
        const head = el("div", "check-head");
        head.appendChild(el("span", "badge " + c.status,
          c.status === "ok" ? "PASS" : c.status === "warn" ? "CHECK" : "FAIL"));
        head.appendChild(el("span", "check-label", c.label));
        chip.appendChild(head);
        chip.appendChild(el("div", "check-detail", c.detail));
        if (c.ref) chip.appendChild(el("div", "check-ref", "Ref: " + c.ref));
        cwrap.appendChild(chip);
      });
      host.appendChild(cwrap);
    }

    // notes
    if (r.notes && r.notes.length) {
      const n = el("div", "notes");
      r.notes.forEach((t) => n.appendChild(el("div", "note", t)));
      host.appendChild(n);
    }
    // references
    if (r.refs && r.refs.length) {
      const ref = el("div", "refs");
      ref.appendChild(el("span", "refs-h", "References: "));
      ref.appendChild(document.createTextNode(r.refs.join(" · ")));
      host.appendChild(ref);
    }
  }

  /* ---------- boot ---------- */
  // Booted by the tool loader once all tool files have registered.
  PET.boot = function () {
    buildSidebar();
    document.getElementById("calcbtn").onclick = calculate;
    if (PET.tools.length) selectTool(PET.tools[0].id);
    const t = document.getElementById("navtoggle");
    if (t) t.onclick = () => document.body.classList.toggle("nav-open");
  };
})();
