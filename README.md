# rSlider README

A lightweight, ES6-class range (and single) slider with optional scale, labels, tooltips, and easy Phoenix LiveView integration.
**Rewrite of [range-slider](https://github.com/slawomir-zaziablo/range-slider) in ES6 class.**

---

## Features

* Single-value or range selection
* Configurable tick **scale** and **labels**
* Optional **tooltip** bubbles
* **Mobile-friendly** pointer events
* **No dependencies** (vanilla JS + CSS)
* **Phoenix LiveView**

---

## Installation

1. **Copy CSS**
   Drop `rSlider.css` into your `assets/css/` and import it in your app.css `@import "../css/rSlider.css";`

2. **Copy JS**
   Drop `rSlider.js` into `assets/vendor/` (or `priv/static/vendor/`).

3. **Import in your app.js**

   ```js
   import rSlider from "../vendor/rSlider.js";
   ```

---

## Usage

### Plain JavaScript

```html
<input id="mySlider" type="text" />

<script>
  const slider = new rSlider({
    target: "#mySlider",
    values: { min: 0, max: 100 }, // OR [0,10,20,…]
    step: 10,
    range: true,
    set: [20, 80],
    scale: true,
    labels: true,
    tooltip: true,
    onChange: value => console.log("Selected:", value)
  });
</script>
```

### Phoenix LiveView Hook

1. **Hook definition** (`assets/js/hooks/slider.js`):

   ```js
   import rSlider from "../../vendor/rSlider.js";

   function parseVals(str) {
     if (str.includes("-")) {
       const [a,b] = str.split("-").map(Number);
       return { min: a, max: b };
     }
     return str.split("|").map(v => isNaN(v) ? v : Number(v));
   }

   function parseNumberString(s) {
     return s.split(",").map(n => Number(n.trim()));
   }

   const Slider = {
     mounted() {
       const d = this.el.dataset;
       this.slider = new rSlider({
         target: this.el,
         values: parseVals(d.values),
         step:  Number(d.step),
         range:  d.range === "true",
         set:    d.set ? d.set.split("|").map(Number) : [],
         scale:  d.scale === "true",
         labels: d.labels === "true",
         tooltip:d.tooltip === "true",
         disabled: d.disabled === "true",
         onChange: v =>
           this.pushEventTo(this.el, `${this.el.id}-change`, {
             value: parseNumberString(v)
           })
       });
     },
     updated() {
       const s = this.el.dataset.set;
       if (s) this.slider.setValues(...s.split("|").map(Number));
     },
     destroyed() {
       this.slider.destroy();
     }
   };

   export default Slider;
   ```

2. **Register the hook** in `app.js`:

   ```js
   import Slider from "./hooks/slider.js";
   let liveSocket = new LiveSocket("/live", Socket, { hooks: { Slider } });
   ```

3. **Component template**:

   ```elixir
   defmodule MyWeb.SliderComponent do
     @moduledoc """
     Custom Slider Component using web hook
     """
     use Phoenix.Component

     attr :id, :string, required: true
     # values can be a list or a map with min and max keys or a string with a range
     # e.g. values={[0, 100]} or values={%{min: 0, max: 100}}
     attr :values, :any, default: %{min: 0, max: 100}
     attr :step, :integer, default: 1
     # range is a boolean that determines if the slider is a range slider
     attr :range, :boolean, default: false
     # set is a list of values that will be set when the slider is initialized
     attr :set, :list, default: []
     # scale that determines if the slider has a scale
     attr :scale, :boolean, default: false
     # labels that determines if the slider has labels
     attr :labels, :boolean, default: false
     attr :tooltip, :boolean, default: false
     attr :disabled, :boolean, default: false
     attr :class, :string, default: ""
     attr :rest, :global

     def slider(assigns) do
       ~H"""
       <input
         id={@id}
         type="text"
         phx-hook="Slider"
         data-values={transform_values(@values)}
         data-step={@step}
         data-range={to_string(@range)}
         data-set={transform_set(@set)}
         data-scale={to_string(@scale)}
         data-labels={to_string(@labels)}
         data-tooltip={to_string(@tooltip)}
         data-disabled={to_string(@disabled)}
         class={@class}
         {@rest}
       />
       """
     end

     defp transform_values(%{min: a, max: b}), do: "#{a}-#{b}"
     defp transform_values(list) when is_list(list), do: Enum.join(list, "|")

     defp transform_set([]), do: []
     defp transform_set(set) when is_list(set), do: Enum.join(set, "|")
     defp transform_set(_set), do: []
   end

   ```
---

## API

```ts
new rSlider({
  target: string|HTMLElement,
  values: any[] | {min:number, max:number},
  step?: number,
  range?: boolean,
  set?: any[],
  scale?: boolean,
  labels?: boolean,
  tooltip?: boolean,
  disabled?: boolean,
  onChange?: (value) => void
});
```

---

## Example

```html
<div>
  <p>Single: <span id="out1">50</span></p>
  <input id="s1" type="text" />
</div>
<div>
  <p>Range: <span id="out2">20–80</span></p>
  <input id="s2" type="text" />
</div>

<script>
  const s1 = new rSlider({
    target: "#s1",
    values: { min: 0, max: 100 },
    step: 5,
    set: [50],
    tooltip: true,
    onChange: v => document.getElementById("out1").textContent = v
  });

  const s2 = new rSlider({
    target: "#s2",
    values: [0,10,20,30,40,50,60,70,80,90,100],
    range: true,
    set: [20,80],
    scale: true,
    labels: true,
    onChange: v => document.getElementById("out2").textContent = v.join("–")
  });
</script>
```

---

## License

MIT License
