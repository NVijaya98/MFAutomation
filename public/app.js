const state = {
  jobs: [],
  mainframeCredentials: null
};

const elements = {
  credentialGate: document.getElementById("credential-gate"),
  mainframeUserId: document.getElementById("mainframe-user-id"),
  mainframePassword: document.getElementById("mainframe-password"),
  beginSession: document.getElementById("begin-session"),
  changeCredentials: document.getElementById("change-credentials"),
  logoutSession: document.getElementById("logout-session"),
  themeSelect: document.getElementById("theme-select"),
  sessionIdentity: document.getElementById("session-identity"),
  connectionMode: document.getElementById("connection-mode"),
  jobSelect: document.getElementById("job-select"),
  actionSelect: document.getElementById("action-select"),
  jobCount: document.getElementById("job-count"),
  jobSummary: document.getElementById("job-summary"),
  resultView: document.getElementById("result-view"),
  lastStatus: document.getElementById("last-status"),
  launchSelected: document.getElementById("launch-selected")
};

async function boot() {
  document.body.classList.add("modal-open");
  applyTheme("regular");
  await Promise.all([loadHealth(), loadJobs()]);
  bindEvents();
  updateSessionState();
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

  if (!selectedJob) {
    elements.jobSummary.innerHTML = "";
    return;
  }

  renderJobSummary(selectedJob);
}

function getSelectedJob() {
  return state.jobs.find((job) => job.id === elements.jobSelect.value) || null;
}

function bindEvents() {
  elements.jobSelect.addEventListener("change", updateCommandOptions);
  elements.actionSelect.addEventListener("change", updateCommandOptions);
  elements.beginSession.addEventListener("click", beginSession);
  elements.changeCredentials.addEventListener("click", reopenCredentialGate);
  elements.logoutSession.addEventListener("click", logoutSession);
  elements.themeSelect.addEventListener("change", () => {
    applyTheme(elements.themeSelect.value);
  });
  elements.mainframeUserId.addEventListener("keydown", handleCredentialKeydown);
  elements.mainframePassword.addEventListener("keydown", handleCredentialKeydown);
  elements.actionSelect.addEventListener("keydown", handleLaunchKeydown);
  elements.jobSelect.addEventListener("keydown", handleLaunchKeydown);

  elements.launchSelected.addEventListener("click", () => {
    launchSelectedJob();
  });
}

function renderJobSummary(job) {
  const summaryItems = [
    { label: "Batch", value: job.displayName || job.jobName },
    { label: "Job Name", value: job.jobName || "-" },
    { label: "Application", value: job.schedulerApplication || "-" },
    { label: "Operation", value: job.schedulerOperation || "-" },
    { label: "Action", value: elements.actionSelect.value === "execute" ? "Execute" : "List Jobs In Scheduler" }
  ];

  elements.jobSummary.innerHTML = summaryItems
    .map(
      (item) => `
        <div class="summary-item">
          <div class="summary-label">${item.label}</div>
          <div class="summary-value">${item.value}</div>
        </div>
      `
    )
    .join("");
}

function beginSession() {
  const userId = elements.mainframeUserId.value.trim();
  const password = elements.mainframePassword.value;

  if (!userId || !password) {
    elements.lastStatus.textContent = "Credentials required";
    elements.resultView.textContent = JSON.stringify(
      { message: "Enter mainframe user ID and password to unlock the launcher." },
      null,
      2
    );
    return;
  }

  state.mainframeCredentials = {
    userId,
    password
  };

  elements.mainframePassword.value = "";
  elements.credentialGate.classList.add("hidden");
  document.body.classList.remove("modal-open");
  updateSessionState();
  elements.lastStatus.textContent = "Ready";
}

function handleCredentialKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    beginSession();
  }
}

function handleLaunchKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    launchSelectedJob();
  }
}

function reopenCredentialGate() {
  elements.credentialGate.classList.remove("hidden");
  document.body.classList.add("modal-open");
  elements.mainframePassword.value = "";
  elements.mainframePassword.focus();
}

function logoutSession() {
  state.mainframeCredentials = null;
  elements.mainframeUserId.value = "";
  elements.mainframePassword.value = "";
  elements.lastStatus.textContent = "Logged out";
  elements.resultView.textContent = "Session cleared. Sign in again to continue.";
  updateSessionState();
  reopenCredentialGate();
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function updateSessionState() {
  const hasCredentials = Boolean(state.mainframeCredentials);
  elements.launchSelected.disabled = !hasCredentials;
  elements.sessionIdentity.textContent = hasCredentials
    ? `Signed in as ${state.mainframeCredentials.userId}`
    : "Mainframe sign-in required";
}

function launchSelectedJob() {
  launchCommand();
}

async function launchCommand() {
  if (!state.mainframeCredentials) {
    reopenCredentialGate();
    return;
  }

  elements.lastStatus.textContent = "Launching";
  elements.resultView.textContent = "Submitting request...";

  try {
    const response = await fetch("/ui/launch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: elements.actionSelect.value,
        jobId: elements.jobSelect.value,
        mainframeCredentials: {
          userId: state.mainframeCredentials.userId,
          password: state.mainframeCredentials.password
        }
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
