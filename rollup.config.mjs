import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/light-card-hue-feature.js",
      format: "es",
      inlineDynamicImports: true,
    },
    plugins: [json(), typescript(), nodeResolve(), commonjs(), terser()],
  },
];
