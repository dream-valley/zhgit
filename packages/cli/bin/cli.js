#!/usr/bin/env node

// import { filename } from "dirname-filename-esm";
// import importLocal from "import-local";
// import { log } from "@marh/utils";
import entry from "../src/index.js";

// const __filename = filename(import.meta);

// if (importLocal(__filename)) {
//   log.info("cli", "使用本地 cli");
// } else {
//   entry(process.argv.slice(2));
// }

entry(process.argv.slice(2));
