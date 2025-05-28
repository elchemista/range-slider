// move rSlider.js to assets/vendor/rSlider.js
import rSlider from "../../vendor/rSlider.js";

function parseVals(str) {
  if (str.includes("-")) {
    const [a, b] = str.split("-").map(Number);
    return { min: a, max: b };
  }
  return str.split("|").map((v) => (isNaN(v) ? v : Number(v)));
}

function parseNumberString(inputString) {
  if (typeof inputString !== "string") {
    console.error("Input must be a string.");
    return [];
  }

  if (inputString.includes(",")) {
    return inputString
      .split(",")
      .map((numStr) => parseFloat(numStr.trim()))
      .filter((num) => !isNaN(num)); // Filter out NaN values
  } else {
    const num = parseFloat(inputString.trim());
    return isNaN(num) ? [] : [num];
  }
}

const Slider = {
  mounted() {
    const d = this.el.dataset;

    this.slider = new rSlider({
      target: this.el,
      values: parseVals(d.values),
      step: Number(d.step),
      range: d.range === "true",
      set: d.set ? d.set.split("|").map(Number) : [],
      scale: d.scale === "true",
      labels: d.labels === "true",
      tooltip: d.tooltip === "true",
      disabled: d.disabled === "true",
      onChange: (v) =>
        this.pushEventTo(this.el, `${this.el.id}-change`, {
          value: parseNumberString(v),
        }),
    });
  },
  updated() {
    const s = this.el.dataset.set;
    if (s) this.slider.setValues(...s.split("|").map(Number));
  },
  destroyed() {
    this.slider.destroy();
  },
};

export default Slider;
