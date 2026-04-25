const state = {
  jobs: []
};

const elements = {
  connectionMode: document.getElementById("connection-mode"),
  sharedSecret: document.getElementById("shared-secret"),
  jobSelect: document.getElementById("job-select"),
  commandSelect: document.getElementById("command-select"),
  chatCommand: document.getElementById("chat-command"),
  source: document.getElementById("source"),
  userId: document.getElementById("user-id"),
  jobCount: document.getElementById("job-count"),
  jobSummary: document.getElementById("job-summary"),
  resultView: document.getElementById("result-view"),
  lastStatus: document.getElementById("last-status"),
  launchSelected: document.getElementById("launch-selected"),
  useCommand: document.getElementById("use-command"),
  launchChat: document.getElementById("launch-chat")
};

async function boot() {
  await Promise.all([loadHealth(), loadJobs()]);
  bindEvents();
}

async function loadHealth() {
  const response = await fetch("/health");
  const payload = await response.json();
  elements.connectionMode.textContent = payload.izwsConnectionMode || "unknown";
}

async function loadJobs() {
  const response = await fetch("/api/jobs");
  const payload = await response.json();
  state.jobs = payload.jobs || [];
  renderJobs();
}

function renderJobs() {
  elements.jobSelect.innerHTML = "";

  state.jobs.forEach((job, index) => {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = `${job.displayName} (${job.jobName})`;
    if (index === 0) {
      option.selected = true;
    }
    elements.jobSelect.appendChild(option);
  });

  elements.jobCount.textContent = `${state.jobs.length} job${state.jobs.length === 1 ? "" : "s"}`;
  updateCommandOptions();
}

function updateCommandOptions() {
  const selectedJob = getSelectedJob();
  elements.commandSelect.innerHTML = "";

  if (!selectedJob) {
    elements.jobSummary.textContent = "No jobs configured yet.";
    return;
  }

  selectedJob.commandPhrases.forEach((phrase, index) => {
    const option = document.createElement("option");
    option.value = phrase;
    option.textContent = phrase;
    if (index === 0) {
      option.selected = true;
    }
    elements.commandSelect.appendChild(option);
  });

  elements.chatCommand.value = selectedJob.defaultCommand || selectedJob.commandPhrases[0] || "";
  elements.jobSummary.textContent =
    `${selectedJob.description} Application: ${selectedJob.schedulerApplication}. ` +
    `Operation: ${selectedJob.schedulerOperation}. Job: ${selectedJob.jobName}.`;
}

function getSelectedJob() {
  return state.jobs.find((job) => job.id === elements.jobSelect.value) || null;
}

function bindEvents() {
  elements.jobSelect.addEventListener("change", updateCommandOptions);

  elements.commandSelect.addEventListener("change", () => {
    elements.chatCommand.value = elements.commandSelect.value;
  });

  elements.useCommand.addEventListener("click", () => {
    elements.chatCommand.value = elements.commandSelect.value;
    elements.lastStatus.textContent = "Command ready";
  });

  elements.launchSelected.addEventListener("click", () => {
    launchCommand(elements.commandSelect.value);
  });

  elements.launchChat.addEventListener("click", () => {
    launchCommand(elements.chatCommand.value);
  });
}

async function launchCommand(command) {
  elements.lastStatus.textContent = "Launching";
  elements.resultView.textContent = "Submitting request...";

  try {
    const response = await fetch("/chat/command", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-chat-secret": elements.sharedSecret.value
      },
      body: JSON.stringify({
        command,
        source: elements.source.value || "operator-ui",
        userId: elements.userId.value || "local-operator"
      })
    });

    const payload = await response.json();
    elements.lastStatus.textContent = response.ok ? "Request complete" : "Request failed";
    elements.resultView.textContent = JSON.stringify(payload, null, 2);
  } catch (error) {
    elements.lastStatus.textContent = "Network error";
    elements.resultView.textContent = JSON.stringify(
      { message: error.message || "Unable to submit request." },
      null,
      2
    );
  }
}

boot().catch((error) => {
  elements.connectionMode.textContent = "error";
  elements.resultView.textContent = JSON.stringify({ message: error.message }, null, 2);
});
