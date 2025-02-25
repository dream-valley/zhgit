export default class Command {
  constructor(instance) {
    if (!instance) {
      throw new Error("command instance is required");
    }

    this.program = instance;

    const cmd = this.program.command(this.command);

    cmd.description(this.description);

    cmd.hook("preAction", () => {
      this.preAction();
    });
    cmd.hook("postAction", () => {
      this.postAction();
    });

    if (this.options?.length > 0) {
      this.options.forEach((opt) => {
        cmd.option(...opt);
      });
    }

    cmd.action((...params) => {
      this.action(params);
    });
  }

  get command() {
    throw new Error("command must implement");
  }

  get description() {
    throw new Error("description must implement");
  }

  get options() {
    return [];
  }

  get action() {
    throw new Error("action must implement");
  }

  preAction() {}
  postAction() {}
}
