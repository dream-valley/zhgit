import createPushCommand from "@zhihaoo/push";
import createConfigCommand from "@zhihaoo/config";
import createBranchCommand from "@zhihaoo/branch";
import createCLI from "./createCLI.js";

export default function (args) {
  const program = createCLI();
  createPushCommand(program);
  createConfigCommand(program);
  createBranchCommand(program);
  program.parse(process.argv);
}
