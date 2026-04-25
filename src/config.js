const config = {
  port: Number(process.env.PORT || 3000),
  izws: {
    connectionMode: process.env.IZWS_CONNECTION_MODE || "mock",
    baseUrl: process.env.IZWS_BASE_URL || "",
    port: process.env.IZWS_PORT || "",
    authMethod: process.env.IZWS_AUTH_METHOD || "",
    username: process.env.IZWS_USERNAME || "",
    password: process.env.IZWS_PASSWORD || "",
    apiPath: process.env.IZWS_API_PATH || "",
    engineName: process.env.IZWS_ENGINE_NAME || "",
    uss: {
      host: process.env.USS_HOST || "",
      port: process.env.USS_PORT || "",
      protocol: process.env.USS_PROTOCOL || "ssh",
      commandPath: process.env.USS_COMMAND_PATH || "",
      commandTemplate: process.env.USS_COMMAND_TEMPLATE || ""
    }
  }
};

module.exports = { config };
