// rollup.config.js
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import shebang from "rollup-plugin-add-shebang";

export default {
  input: "bin/cli.js", // 入口文件
  output: {
    dir: "dist", // 使用 output.dir 而不是 output.file
    entryFileNames: "index.js", // 指定生成的文件名
    format: "esm", // 使用 CommonJS 格式
    preserveModules: false, // 确保输出为一个文件
  },
  plugins: [
    shebang("#!/usr/bin/env node"), // 添加 Shebang 行
    nodeResolve(), // 解析 node_modules 依赖
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
