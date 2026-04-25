class IzwsClient {
  constructor(config) {
    this.config = config;
  }

  async startJob(jobDefinition, launchContext) {
    const { requestContext, mainframeCredentials } = launchContext;

    if (this.config.connectionMode === "mock") {
      return {
        status: "pending_configuration",
        message: "IZWS connection is not configured yet. Request captured in mock mode.",
        mode: this.config.connectionMode,
        jobDefinition,
        requestContext,
        authentication: {
          mainframeUserId: mainframeCredentials.userId
        }
      };
    }

    if (this.config.connectionMode === "api") {
      return this.startJobViaApi(jobDefinition, requestContext, mainframeCredentials);
    }

    if (this.config.connectionMode === "uss") {
      return this.startJobViaUss(jobDefinition, requestContext, mainframeCredentials);
    }

    return {
      status: "configuration_error",
      message: `Unsupported IZWS connection mode '${this.config.connectionMode}'. Use mock, api, or uss.`
    };
  }

  async listSchedulerJobs(launchContext) {
    const { requestContext, mainframeCredentials } = launchContext;

    if (this.config.connectionMode === "mock") {
      return {
        status: "pending_configuration",
        message: "Scheduler job list captured in mock mode.",
        mode: this.config.connectionMode,
        schedulerJobs: [
          {
            schedulerApplication: "PSEUDO",
            schedulerOperation: "BATCH",
            jobName: "PSEUDOBAT",
            status: "READY"
          },
          {
            schedulerApplication: "DAILY",
            schedulerOperation: "RECON",
            jobName: "DAILYRCN",
            status: "HOLD"
          }
        ],
        requestContext,
        authentication: {
          mainframeUserId: mainframeCredentials.userId
        }
      };
    }

    if (this.config.connectionMode === "api") {
      return this.listSchedulerJobsViaApi(requestContext, mainframeCredentials);
    }

    if (this.config.connectionMode === "uss") {
      return this.listSchedulerJobsViaUss(requestContext, mainframeCredentials);
    }

    return {
      status: "configuration_error",
      message: `Unsupported IZWS connection mode '${this.config.connectionMode}'. Use mock, api, or uss.`
    };
  }

  async startJobViaApi(jobDefinition, requestContext, mainframeCredentials) {
    if (!this.config.baseUrl || !this.config.apiPath) {
      return {
        status: "configuration_error",
        message: "IZWS API mode is enabled, but base URL or API path is missing."
      };
    }

    return {
      status: "not_implemented",
      message: "Wire the real IZWS API call here when the endpoint details are available.",
      target: {
        baseUrl: this.config.baseUrl,
        port: this.config.port || null,
        apiPath: this.config.apiPath,
        authMethod: this.config.authMethod || null,
        engineName: this.config.engineName || null
      },
      jobDefinition,
      requestContext,
      authentication: {
        mainframeUserId: mainframeCredentials.userId
      }
    };
  }

  async startJobViaUss(jobDefinition, requestContext, mainframeCredentials) {
    if (!this.config.uss.host || !this.config.uss.commandPath) {
      return {
        status: "configuration_error",
        message: "USS mode is enabled, but USS host or command path is missing."
      };
    }

    return {
      status: "not_implemented",
      message: "Wire the real USS command execution here when the host and command details are available.",
      target: {
        host: this.config.uss.host,
        port: this.config.uss.port || null,
        protocol: this.config.uss.protocol,
        commandPath: this.config.uss.commandPath,
        commandTemplate: this.config.uss.commandTemplate || null
      },
      jobDefinition,
      requestContext,
      authentication: {
        mainframeUserId: mainframeCredentials.userId
      }
    };
  }

  async listSchedulerJobsViaApi(requestContext, mainframeCredentials) {
    if (!this.config.baseUrl || !this.config.apiPath) {
      return {
        status: "configuration_error",
        message: "IZWS API mode is enabled, but base URL or API path is missing."
      };
    }

    return {
      status: "not_implemented",
      message: "Wire the real IZWS scheduler job listing API call here.",
      target: {
        baseUrl: this.config.baseUrl,
        port: this.config.port || null,
        apiPath: this.config.apiPath,
        authMethod: this.config.authMethod || null,
        engineName: this.config.engineName || null
      },
      requestContext,
      authentication: {
        mainframeUserId: mainframeCredentials.userId
      }
    };
  }

  async listSchedulerJobsViaUss(requestContext, mainframeCredentials) {
    if (!this.config.uss.host || !this.config.uss.commandPath) {
      return {
        status: "configuration_error",
        message: "USS mode is enabled, but USS host or command path is missing."
      };
    }

    return {
      status: "not_implemented",
      message: "Wire the real USS scheduler job listing command here.",
      target: {
        host: this.config.uss.host,
        port: this.config.uss.port || null,
        protocol: this.config.uss.protocol,
        commandPath: this.config.uss.commandPath,
        commandTemplate: this.config.uss.commandTemplate || null
      },
      requestContext,
      authentication: {
        mainframeUserId: mainframeCredentials.userId
      }
    };
  }
}

module.exports = { IzwsClient };
