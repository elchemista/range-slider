export default class rSlider {
  constructor(conf = {}) {
    // Public configuration
    this.conf = Object.freeze({
      target: null, // CSS selector or HTMLElement
      values: null, // array OR {min,max}
      step: null, // numeric step (only for range)
      set: null, // [start, end] initial values
      range: false, // single-point or range mode
      width: null, // fixed pixel width for slider
      labels: true, // show numbers under scale ticks
      scale: true, // draw tick marks
      tooltip: true, // bubble with current value
      disabled: false,
      onChange: null, // callback(value)
      ...conf,
    });

    // CSS class map
    this.cls = Object.freeze({
      container: "rs-container",
      bg: "rs-bg",
      selected: "rs-selected",
      pointer: "rs-pointer",
      scale: "rs-scale",
      tip: "rs-tooltip",
      sliding: "sliding",
      disabled: "disabled",
    });

    // Internal refs / state
    this.input = null;
    this.slider = null;
    this.scaleEL = null;
    this.selectedEL = null;
    this.pointerL = null;
    this.pointerR = null;
    this.tipL = null;
    this.tipR = null;
    this.activePtr = null;
    this.valArray = [];
    this.timeout = 0;
    this.sliderLeft = 0;
    this.sliderWidth = 0;
    this.pointerWidth = 0;
    this.stepPx = 0;
    this.values = { start: 0, end: 0 };

    this.#init();
  }

  #init() {
    this.#prepareTarget();
    this.#normalizeValues();
    this.#buildDOM();
    this.#measure();
    this.#renderScale();
    this.#bindEvents();
    this.#updateUI();
  }

  #prepareTarget() {
    const t = this.conf.target;
    this.input = t instanceof HTMLElement ? t : document.querySelector(t);
    if (!this.input) throw Error("Target element not found");
    this.inputDisplay = getComputedStyle(this.input).display;
    this.input.style.display = "none";
  }

  #normalizeValues() {
    const { values, step } = this.conf;

    if (Array.isArray(values)) {
      this.valArray = [...values];
    } else if (values && typeof values === "object") {
      const { min, max } = values;
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max)
        throw Error("Invalid min/max");
      const st = Number(step) || 1;
      this.valArray = Array.from(
        { length: Math.floor((max - min) / st) + 1 },
        (_, i) => min + i * st,
      );
    } else {
      throw Error("conf.values required");
    }

    // initial pointers
    this.values.start = 0;
    this.values.end = this.conf.range ? this.valArray.length - 1 : 0;

    if (Array.isArray(this.conf.set)) {
      const [v0, v1] = this.conf.set;
      const i0 = this.valArray.indexOf(v0);
      if (i0 !== -1) {
        this.values.start = i0;
        this.values.end = i0;
      }
      if (this.conf.range && v1 !== undefined) {
        const i1 = this.valArray.indexOf(v1);
        if (i1 !== -1) this.values.end = i1;
      }
    }
  }

  #buildDOM() {
    const C = this.cls,
      el = this.#el.bind(this);

    this.slider = el("div", C.container);
    this.slider.innerHTML = `<div class="${C.bg}"></div>`;
    this.selectedEL = el("div", C.selected);

    // scale element only if enabled
    if (this.conf.scale) this.scaleEL = el("div", C.scale);

    // main pointer (left or single)
    this.pointerL = el("div", C.pointer, ["dir", "left"]);
    if (this.conf.tooltip) {
      this.tipL = el("div", C.tip);
      this.pointerL.append(this.tipL);
    }

    // assemble
    this.slider.append(this.selectedEL);
    if (this.scaleEL) this.slider.append(this.scaleEL);
    this.slider.append(this.pointerL);

    if (this.conf.range) {
      this.pointerR = el("div", C.pointer, ["dir", "right"]);
      if (this.conf.tooltip) {
        this.tipR = el("div", C.tip);
        this.pointerR.append(this.tipR);
      }
      this.slider.append(this.pointerR);
    }

    this.input.after(this.slider);
    if (this.conf.width)
      this.slider.style.width = `${parseInt(this.conf.width, 10)}px`;
    if (this.conf.disabled) this.slider.classList.add(C.disabled);
  }

  #el(tag, cls, attr) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attr?.length === 2) e.setAttribute(`data-${attr[0]}`, attr[1]);
    return e;
  }

  #measure() {
    const r = this.slider.getBoundingClientRect();
    this.sliderLeft = r.left;
    this.sliderWidth = r.width;
    this.pointerWidth = this.pointerL.offsetWidth;
    // distance in pixels between two consecutive values
    this.stepPx = this.sliderWidth / (this.valArray.length - 1);
  }

  /* Render tick marks – skipped entirely if scale is disabled */
  #renderScale() {
    if (!this.conf.scale) return;

    this.scaleEL.textContent = "";
    const pct = 100 / (this.valArray.length - 1); // % width of one segment
    this.valArray.forEach((v, i) => {
      const span = this.#el("span");
      span.style.width = i === this.valArray.length - 1 ? 0 : `${pct}%`;

      const ins = this.#el("ins");
      if (this.conf.labels || i === 0 || i === this.valArray.length - 1)
        ins.textContent = v;

      span.append(ins);
      this.scaleEL.append(span);
    });
  }

  #bindEvents() {
    const on = (el, ev, fn) =>
      ev
        .split(" ")
        .forEach((e) => el.addEventListener(e, fn, { passive: false }));

    on(this.pointerL, "pointerdown", (e) => this.#dragStart(e, this.pointerL));
    if (this.conf.range)
      on(this.pointerR, "pointerdown", (e) =>
        this.#dragStart(e, this.pointerR),
      );

    on(document, "pointermove", (e) => this.#dragMove(e));
    on(document, "pointerup pointercancel", () => this.#dragEnd());

    if (this.conf.scale) on(this.scaleEL, "click", (e) => this.#jump(e));

    window.addEventListener("resize", () => {
      this.#measure();
      this.#renderScale();
      this.#updateUI();
    });
  }

  #dragStart(e, p) {
    if (this.conf.disabled) return;
    e.preventDefault();
    p.setPointerCapture?.(e.pointerId);
    this.activePtr = p;
    this.slider.classList.add(this.cls.sliding);
  }

  #dragMove(e) {
    if (!this.activePtr || this.conf.disabled) return;
    let idx = Math.round((e.clientX - this.sliderLeft) / this.stepPx);
    idx = Math.max(0, Math.min(idx, this.valArray.length - 1));

    if (this.conf.range) {
      if (this.activePtr === this.pointerL) this.values.start = idx;
      else this.values.end = idx;
      if (this.values.start > this.values.end)
        [this.values.start, this.values.end] = [
          this.values.end,
          this.values.start,
        ];
    } else {
      this.values.end = idx;
    }
    this.#updateUI();
  }

  #dragEnd() {
    if (this.activePtr) {
      this.activePtr.releasePointerCapture?.(event.pointerId);
      this.activePtr = null;
      this.slider.classList.remove(this.cls.sliding);
    }
  }

  #jump(e) {
    if (this.conf.disabled) return;
    let idx = Math.round((e.clientX - this.sliderLeft) / this.stepPx);
    idx = Math.max(0, Math.min(idx, this.valArray.length - 1));

    if (this.conf.range) {
      const dStart = Math.abs(idx - this.values.start);
      const dEnd = Math.abs(idx - this.values.end);
      if (dStart <= dEnd) this.values.start = idx;
      else this.values.end = idx;
      if (this.values.start > this.values.end)
        [this.values.start, this.values.end] = [
          this.values.end,
          this.values.start,
        ];
    } else {
      this.values.end = idx;
    }
    this.#updateUI();
  }

  #updateUI() {
    const { start, end } = this.values;
    const off = this.pointerWidth / 2;
    const active = this.conf.range ? start : end;

    this.pointerL.style.left = `${active * this.stepPx - off}px`;
    if (this.conf.range)
      this.pointerR.style.left = `${end * this.stepPx - off}px`;

    this.selectedEL.style.left = this.conf.range
      ? `${start * this.stepPx}px`
      : "0px";
    this.selectedEL.style.width = `${(end - start) * this.stepPx}px`;

    if (this.conf.tooltip) {
      this.tipL.textContent = this.valArray[active];
      if (this.conf.range) this.tipR.textContent = this.valArray[end];
    }

    this.input.value = this.conf.range
      ? `${this.valArray[start]},${this.valArray[end]}`
      : this.valArray[end];

    clearTimeout(this.timeout);
    this.timeout = setTimeout(
      () => this.conf.onChange?.(this.input.value),
      300,
    );
  }

  disabled(state = true) {
    this.conf.disabled = state;
    this.slider.classList.toggle(this.cls.disabled, state);
  }

  getValue() {
    return this.input.value;
  }

  destroy() {
    this.input.style.display = this.inputDisplay;
    this.slider.remove();
  }
}
