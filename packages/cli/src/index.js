import createPushCommand from "@zh/push";
import createConfigCommand from "@zh/config";
import createCLI from "./createCLI.js";

export default function (args) {
  const program = createCLI();
  createPushCommand(program);
  createConfigCommand(program);
  program.parse(process.argv);
}
