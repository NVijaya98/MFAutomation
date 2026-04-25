class IzwsClient {
  constructor(config) {
    this.config = config;
  }

  async startJob(jobDefinition, requestContext) {
    if (this.config.connectionMode !== "api") {
      return {
        status: "pending_configuration",
        message: "IZWS connection is not configured yet. Request captured in mock mode.",
        mode: this.config.connectionMode,
        jobDefinition,
        requestContext
      };
    }

    if (!this.config.baseUrl || !this.config.username || !this.config.password) {
      return {
        status: "configuration_error",
        message: "IZWS API mode is enabled, but base URL or credentials are missing."
      };
    }

    return {
      status: "not_implemented",
      message: "Wire the real IZWS API call here when the endpoint details are available.",
      target: {
        baseUrl: this.config.baseUrl,
        engineName: this.config.engineName || null
      },
      jobDefinition,
      requestContext
    };
  }
}

module.exports = { IzwsClient };
