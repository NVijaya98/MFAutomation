const jobs = {
  pseudoBatch: {
    id: "pseudoBatch",
    displayName: "Pseudo Batch",
    commandPhrases: ["execute pseudo batch", "run pseudo batch", "start pseudo batch"],
    defaultCommand: "execute pseudo batch",
    schedulerApplication: "PSEUDO",
    schedulerOperation: "BATCH",
    jobName: "PSEUDOBAT",
    description: "Placeholder batch flow wired for chat-trigger testing."
  }
};

function findJobByCommand(commandText) {
  const normalized = normalizeCommand(commandText);

  return Object.values(jobs).find((job) =>
    job.commandPhrases.some((phrase) => normalizeCommand(phrase) === normalized)
  );
}

function normalizeCommand(commandText) {
  return String(commandText || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = {
  jobs,
  findJobByCommand,
  normalizeCommand,
  listJobs: () => Object.values(jobs)
};
