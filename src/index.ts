// Copyright 2025 Silvano Cerza

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { customElement, property, state } from "lit/decorators.js";
import { html, LitElement, nothing } from "lit";
import memoizeOne from "memoize-one";
import { styleMap } from "lit/directives/style-map.js";
import type {
  HassEntity,
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";
import localize from "./localization";

const UNAVAILABLE = "unavailable";

const enum LightColorMode {
  UNKNOWN = "unknown",
  ONOFF = "onoff",
  BRIGHTNESS = "brightness",
  COLOR_TEMP = "color_temp",
  HS = "hs",
  XY = "xy",
  RGB = "rgb",
  RGBW = "rgbw",
  RGBWW = "rgbww",
  WHITE = "white",
}

interface LightEntityAttributes extends HassEntityAttributeBase {
  min_color_temp_kelvin?: number;
  max_color_temp_kelvin?: number;
  min_mireds?: number;
  max_mireds?: number;
  brightness?: number;
  xy_color?: [number, number];
  hs_color?: [number, number];
  color_temp?: number;
  color_temp_kelvin?: number;
  rgb_color?: [number, number, number];
  rgbw_color?: [number, number, number, number];
  rgbww_color?: [number, number, number, number, number];
  effect?: string;
  effect_list?: string[] | null;
  supported_color_modes?: LightColorMode[];
  color_mode?: LightColorMode;
}

interface LightEntity extends HassEntityBase {
  attributes: LightEntityAttributes;
}

const lightSupportsColorMode = (entity: LightEntity, mode: LightColorMode) =>
  entity.attributes.supported_color_modes?.includes(mode) || false;

const hsv2rgb = (hsv: [number, number, number]): [number, number, number] => {
  const [h, s, v] = hsv;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  return [f(5), f(3), f(1)];
};

const rgb2hsv = (rgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb;
  const v = Math.max(r, g, b);
  const c = v - Math.min(r, g, b);
  const h =
    c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
};

const supportsLightColorHueCardFeature = (stateObj: HassEntity) => {
  const entityId = stateObj.entity_id;
  const domain = entityId.substring(0, entityId.indexOf("."));
  return (
    domain === "light" &&
    (lightSupportsColorMode(stateObj, LightColorMode.XY) ||
      lightSupportsColorMode(stateObj, LightColorMode.XY) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGB) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGBW) ||
      lightSupportsColorMode(stateObj, LightColorMode.RGBWW))
  );
};

@customElement("light-color-hue")
export class HuiLightColorHueCardFeature extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: LightColorHueCardFeatureConfig;

  static getStubConfig(): LightColorHueCardFeatureConfig {
    return {
      type: "custom:light-color-hue",
    };
  }

  public setConfig(config: LightColorHueCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsLightColorHueCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    // Convert to hue
    const rgbColor = this.stateObj.attributes.rgb_color || [255, 255, 255];
    const [hue] = rgb2hsv(rgbColor);

    const gradient = this._generateColorGradient();

    return html`
      <ha-control-slider
        .value=${hue}
        mode="cursor"
        .showHandle=${this.stateObj!.state === "on"}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${localize(this.hass, "ui.card.light.hue")}
        .min=${0}
        .max=${360}
        .step=${1}
        style=${styleMap({
          "--control-slider-background": gradient,
        })}
      >
      </ha-control-slider>
    `;
  }

  private _generateColorGradient = memoizeOne(() => {
    const colors = [
      "rgb(255, 0, 0)", // Red (0°)
      "rgb(255, 127, 0)", // Orange (30°)
      "rgb(255, 255, 0)", // Yellow (60°)
      "rgb(127, 255, 0)", // Yellow-Green (90°)
      "rgb(0, 255, 0)", // Green (120°)
      "rgb(0, 255, 127)", // Green-Cyan (150°)
      "rgb(0, 255, 255)", // Cyan (180°)
      "rgb(0, 127, 255)", // Cyan-Blue (210°)
      "rgb(0, 0, 255)", // Blue (240°)
      "rgb(127, 0, 255)", // Blue-Magenta (270°)
      "rgb(255, 0, 255)", // Magenta (300°)
      "rgb(255, 0, 127)", // Magenta-Red (330°)
      "rgb(255, 0, 0)", // Red (360°)
    ];
    return `linear-gradient(to right, ${colors.join(", ")})`;
  });

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const hue = ev.detail.value;

    // Keeps full saturation and brightness
    const [r, g, b] = hsv2rgb([hue, 1, 1]);

    this.hass!.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      rgb_color: [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
      ],
    });
  }
}

export interface LightColorHueCardFeatureConfig extends LovelaceCardConfig {
  type: "custom:light-color-hue";
}

window.customTileFeatures = window.customTileFeatures || [];
window.customTileFeatures.push({
  type: "light-color-hue",
  name: "Light color hue",
  supported: supportsLightColorHueCardFeature,
});
