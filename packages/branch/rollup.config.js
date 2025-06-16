// rollup.config.js
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.js",
  output: {
    dir: "dist",
    entryFileNames: "index.js",
    format: "esm",
    preserveModules: false,
  },
  external: [
    // 原生模块和 Node.js 内置模块
    "keytar",
    "os",
    "path",
    "fs",
    "child_process",
    "node:http",
    "node:https",
    "node:zlib",
    "node:stream",
    "node:buffer",
    "node:util",
    "node:url",
    "node:net",
    "node:fs",
    "node:path",
  ],
  plugins: [
    nodeResolve({
      // 解析内部模块的关键配置
      preferBuiltins: true, // 优先使用内置模块
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
