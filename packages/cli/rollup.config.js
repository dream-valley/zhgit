// rollup.config.js
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import shebang from "rollup-plugin-add-shebang";

export default {
  input: "bin/cli.js",
  output: {
    dir: "dist",
    entryFileNames: "index.js",
    format: "esm",
    preserveModules: false,
  },
  plugins: [
    shebang("#!/usr/bin/env node"),
    nodeResolve({
      preferBuiltins: false, // 禁用自动转换内置模块（除非必要）
    }),
    commonjs({
      namedExports: {
        "fast-content-type-parse": ["safeParse"],
      },
    }),
    babel({
      babelHelpers: "bundled",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: "> 0.25%, not dead",
          },
        ],
      ],
    }),
    terser(), // 可选：压缩代码
    json(),
  ],
};
