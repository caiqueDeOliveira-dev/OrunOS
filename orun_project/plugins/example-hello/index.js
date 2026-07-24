module.exports = function(context) {
  context.registerTool({
    name: "hello",
    description: "Greet a user by name",
    parameters: {
      type: "object",
      properties: { name: { type: "string", description: "Name to greet" } },
      required: ["name"],
    },
    execute: async (args) => ({ greeting: `Ola, ${args.name}! Bem-vindo ao Orun OS.` }),
  });
  context.registerHook("onMessage", (data) => { context.log("Message:", data.content?.slice(0, 50)); });
  context.log("Hello World plugin loaded!");
};
