const { findJobByCommand, normalizeCommand } = require("./jobs");

async function handleChatCommand(commandText, schedulerClient, requestContext) {
  const normalizedCommand = normalizeCommand(commandText);
  const job = findJobByCommand(normalizedCommand);

  if (!job) {
    return {
      ok: false,
      statusCode: 404,
      body: {
        message: "No batch mapping found for that command.",
        receivedCommand: normalizedCommand
      }
    };
  }

  const schedulerResult = await schedulerClient.startJob(job, requestContext);

  return {
    ok: true,
    statusCode: schedulerResult.status === "configuration_error" ? 500 : 200,
    body: {
      message: `Command '${normalizedCommand}' matched job '${job.jobName}'.`,
      schedulerResult
    }
  };
}

module.exports = { handleChatCommand };
