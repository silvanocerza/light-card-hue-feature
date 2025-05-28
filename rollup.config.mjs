import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/light-card-hue-feature.js",
      format: "es",
    },
    plugins: [typescript(), terser()],
  },
];
