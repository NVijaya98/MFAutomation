const config = {
  port: Number(process.env.PORT || 3000),
  chatSharedSecret: process.env.CHAT_SHARED_SECRET || "change-me",
  izws: {
    connectionMode: process.env.IZWS_CONNECTION_MODE || "mock",
    baseUrl: process.env.IZWS_BASE_URL || "",
    username: process.env.IZWS_USERNAME || "",
    password: process.env.IZWS_PASSWORD || "",
    engineName: process.env.IZWS_ENGINE_NAME || ""
  }
};

module.exports = { config };
