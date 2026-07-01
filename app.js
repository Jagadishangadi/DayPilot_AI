const storageKey = "daypilot-ai-state-v1";

const defaultState = {
  tasks: [
    { id: crypto.randomUUID(), title: "Review priority work", priority: "high", due: "10:00", status: "todo" },
    { id: crypto.randomUUID(), title: "Send follow-up messages", priority: "medium", due: "14:00", status: "doing" },
    { id: crypto.randomUUID(), title: "Clear admin backlog", priority: "low", due: "", status: "todo" }
  ],
  notes: [
    { id: crypto.randomUUID(), body: "Capture quick context here and turn it into tasks from the assistant.", createdAt: Date.now() }
  ],
  reminders: [
    { id: crypto.randomUUID(), text: "Drink water and stretch", time: "16:30" }
  ],
  routines: [
    { id: "review", title: "Morning review", detail: "Pick top 3 outcomes", done: false },
    { id: "inbox", title: "Inbox sweep", detail: "Process messages once", done: false },
    { id: "focus", title: "Deep work block", detail: "Protect 90 minutes", done: false },
    { id: "close", title: "Day shutdown", detail: "Log wins and next steps", done: false }
  ],
  messages: [
    { role: "assistant", text: "Tell me what is on your mind. I can add tasks, build a schedule, summarize priorities, and rebalance your day." }
  ],
  settings: {
    provider: "local",
    apiKey: "",
    dayStart: "09:00",
    dayEnd: "18:00"
  }
};

let state = loadState();

const elements = {
  currentDate: document.querySelector("#currentDate"),
  taskCount: document.querySelector("#taskCount"),
  dueCount: document.querySelector("#dueCount"),
  routineCount: document.querySelector("#routineCount"),
  focusScore: document.querySelector("#focusScore"),
  focusTitle: document.querySelector("#focusTitle"),
  chatLog: document.querySelector("#chatLog"),
  assistantForm: document.querySelector("#assistantForm"),
  assistantInput: document.querySelector("#assistantInput"),
  taskForm: document.querySelector("#taskForm"),
  taskTitle: document.querySelector("#taskTitle"),
  taskPriority: document.querySelector("#taskPriority"),
  taskDue: document.querySelector("#taskDue"),
  taskColumns: document.querySelector("#taskColumns"),
  timeline: document.querySelector("#timeline"),
  noteInput: document.querySelector("#noteInput"),
  saveNoteButton: document.querySelector("#saveNoteButton"),
  noteList: document.querySelector("#noteList"),
  reminderForm: document.querySelector("#reminderForm"),
  reminderText: document.querySelector("#reminderText"),
  reminderTime: document.querySelector("#reminderTime"),
  reminderList: document.querySelector("#reminderList"),
  routineGrid: document.querySelector("#routineGrid"),
  toast: document.querySelector("#toast"),
  clearChatButton: document.querySelector("#clearChatButton"),
  rebalanceButton: document.querySelector("#rebalanceButton"),
  planButton: document.querySelector("#planButton"),
  exportButton: document.querySelector("#exportButton"),
  menuButton: document.querySelector("#menuButton"),
  providerSelect: document.querySelector("#providerSelect"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  dayStartInput: document.querySelector("#dayStartInput"),
  dayEndInput: document.querySelector("#dayEndInput"),
  saveSettingsButton: document.querySelector("#saveSettingsButton")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return mergeState(structuredClone(defaultState), JSON.parse(saved));
  } catch {
    return structuredClone(defaultState);
  }
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    tasks: Array.isArray(saved.tasks) ? saved.tasks : base.tasks,
    notes: Array.isArray(saved.notes) ? saved.notes : base.notes,
    reminders: Array.isArray(saved.reminders) ? saved.reminders : base.reminders,
    routines: Array.isArray(saved.routines) ? saved.routines : base.routines,
    messages: Array.isArray(saved.messages) ? saved.messages : base.messages
  };
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function render() {
  renderDate();
  renderMetrics();
  renderChat();
  renderTasks();
  renderTimeline();
  renderNotes();
  renderReminders();
  renderRoutines();
  renderSettings();
  persist();
}

function renderDate() {
  elements.currentDate.textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
}

function renderMetrics() {
  const openTasks = state.tasks.filter((task) => task.status !== "done");
  const dueToday = openTasks.filter((task) => task.due).length;
  const routinesLeft = state.routines.filter((routine) => !routine.done).length;
  const completion = state.tasks.length
    ? Math.round((state.tasks.filter((task) => task.status === "done").length / state.tasks.length) * 100)
    : 0;
  const routineScore = state.routines.length
    ? Math.round((state.routines.filter((routine) => routine.done).length / state.routines.length) * 30)
    : 0;
  const focusScore = Math.min(99, Math.max(18, 48 + completion + routineScore - openTasks.filter((task) => task.priority === "high").length * 4));

  elements.taskCount.textContent = openTasks.length;
  elements.dueCount.textContent = dueToday;
  elements.routineCount.textContent = routinesLeft;
  elements.focusScore.textContent = focusScore;
  elements.focusTitle.textContent = buildFocusTitle(openTasks);
}

function buildFocusTitle(openTasks) {
  const high = openTasks.filter((task) => task.priority === "high");
  if (!openTasks.length) return "Your board is clear. Keep the day light and intentional.";
  if (high.length) return `Start with ${high[0].title.toLowerCase()}, then protect one focused block.`;
  return "A steady day: group small tasks together and keep one clean focus block.";
}

function renderChat() {
  elements.chatLog.innerHTML = state.messages
    .map((message) => `<div class="message ${message.role === "user" ? "user" : ""}">${escapeHtml(message.text)}</div>`)
    .join("");
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function renderTasks() {
  const columns = [
    { id: "todo", title: "To do" },
    { id: "doing", title: "Doing" },
    { id: "done", title: "Done" }
  ];

  elements.taskColumns.innerHTML = columns
    .map((column) => {
      const tasks = state.tasks.filter((task) => task.status === column.id);
      const cards = tasks.map(renderTaskCard).join("") || `<div class="task-card"><span class="task-meta">Empty</span></div>`;
      return `
        <div class="task-column">
          <h3 class="column-title">${column.title}<span>${tasks.length}</span></h3>
          <div class="task-stack">${cards}</div>
        </div>
      `;
    })
    .join("");
}

function renderTaskCard(task) {
  const label = task.status === "todo" ? "Start" : task.status === "doing" ? "Done" : "Reset";
  const due = task.due ? `Due ${task.due}` : "No time set";
  return `
    <article class="task-card priority-${task.priority} ${task.status === "done" ? "done" : ""}">
      <strong>${escapeHtml(task.title)}</strong>
      <div class="task-meta">${task.priority} - ${due}</div>
      <div class="task-actions">
        <button type="button" data-action="advance" data-id="${task.id}">${label}</button>
        <button type="button" data-action="delete" data-id="${task.id}">Delete</button>
      </div>
    </article>
  `;
}

function renderTimeline() {
  const schedule = buildSchedule();
  elements.timeline.innerHTML = schedule
    .map((item) => `
      <div class="timeline-item">
        <div class="timeline-time">${item.time}</div>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.detail)}</span>
        </div>
      </div>
    `)
    .join("");
}

function buildSchedule() {
  const tasks = [...state.tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority) || (a.due || "99:99").localeCompare(b.due || "99:99"));

  const anchors = [
    { time: state.settings.dayStart, title: "Daily setup", detail: "Review tasks, pick the top 3, clear distractions." },
    ...tasks.slice(0, 5).map((task, index) => ({
      time: task.due || addMinutes(state.settings.dayStart, 75 + index * 70),
      title: task.title,
      detail: `${capitalize(task.priority)} priority - ${task.status === "doing" ? "already in motion" : "ready to start"}`
    })),
    { time: state.settings.dayEnd, title: "Shutdown", detail: "Capture loose ends and set tomorrow's first action." }
  ];

  return anchors.sort((a, b) => a.time.localeCompare(b.time));
}

function renderNotes() {
  elements.noteList.innerHTML = state.notes
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((note) => `
      <article class="note-item">
        <p>${escapeHtml(note.body)}</p>
        <small>${new Date(note.createdAt).toLocaleString()}</small>
      </article>
    `)
    .join("");
}

function renderReminders() {
  elements.reminderList.innerHTML = state.reminders
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((reminder) => `
      <article class="reminder-item">
        <strong>${escapeHtml(reminder.text)}</strong>
        <span>${reminder.time}</span>
      </article>
    `)
    .join("");
}

function renderRoutines() {
  elements.routineGrid.innerHTML = state.routines
    .map((routine) => `
      <article class="routine-card ${routine.done ? "complete" : ""}">
        <strong>${escapeHtml(routine.title)}</strong>
        <span>${escapeHtml(routine.detail)}</span>
        <button type="button" data-routine="${routine.id}">${routine.done ? "Completed" : "Mark done"}</button>
      </article>
    `)
    .join("");
}

function renderSettings() {
  elements.providerSelect.value = state.settings.provider;
  elements.apiKeyInput.value = state.settings.apiKey;
  elements.dayStartInput.value = state.settings.dayStart;
  elements.dayEndInput.value = state.settings.dayEnd;
}

function addTask(title, priority = "medium", due = "", status = "todo") {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;
  state.tasks.unshift({ id: crypto.randomUUID(), title: cleanTitle, priority, due, status });
}

function addReminder(text, time) {
  const cleanText = text.trim();
  if (!cleanText || !time) return;
  state.reminders.push({ id: crypto.randomUUID(), text: cleanText, time });
}

function addNote(body) {
  const cleanBody = body.trim();
  if (!cleanBody) return;
  state.notes.push({ id: crypto.randomUUID(), body: cleanBody, createdAt: Date.now() });
}

function assistantReply(prompt) {
  const intent = analyzePrompt(prompt);

  if (intent.type === "reminder") {
    addReminder(intent.text, intent.time);
    return `Reminder set for ${intent.time}: ${intent.text}`;
  }

  if (intent.type === "note") {
    addNote(intent.text);
    return `Saved note: ${intent.text}`;
  }

  if (intent.type === "task") {
    addTask(intent.title, intent.priority, intent.due);
    const dueText = intent.due ? ` for ${intent.due}` : "";
    return `Added "${intent.title}" as a ${intent.priority}-priority task${dueText}.`;
  }

  if (intent.type === "complete-task" || intent.type === "start-task") {
    const task = findTaskByText(intent.text);
    if (!task) return `I could not find a matching open task for "${intent.text}".`;
    task.status = intent.type === "complete-task" ? "done" : "doing";
    return `${intent.type === "complete-task" ? "Marked done" : "Moved to doing"}: ${task.title}`;
  }

  if (intent.type === "plan") {
    return buildPlanReply();
  }

  if (intent.type === "summary") {
    return buildSummaryReply();
  }

  if (intent.type === "next") {
    return buildNextActionReply();
  }

  if (intent.type === "routine") {
    const next = state.routines.find((routine) => !routine.done);
    return next ? `Next routine: ${next.title}. ${next.detail}.` : "All routines are complete for now.";
  }

  return buildCoachReply(prompt);
}

function analyzePrompt(prompt) {
  const lower = prompt.toLowerCase().trim();
  const time = extractTime(prompt);

  if (/\b(remind|reminder|nudge)\b/.test(lower)) {
    return {
      type: "reminder",
      text: cleanupCommandText(prompt, ["remind me to", "remind", "reminder", "nudge me to", "nudge"]),
      time: time || addMinutes(state.settings.dayStart, 240)
    };
  }

  if (/^(note|save note|remember|write down)\b/i.test(prompt)) {
    return {
      type: "note",
      text: cleanupCommandText(prompt, ["save note", "write down", "remember", "note"])
    };
  }

  if (/\b(done|complete|completed|finished|mark done)\b/.test(lower)) {
    return {
      type: "complete-task",
      text: cleanupCommandText(prompt, ["mark done", "completed", "complete", "finished", "done"])
    };
  }

  if (/\b(start|begin|work on|move to doing)\b/.test(lower)) {
    return {
      type: "start-task",
      text: cleanupCommandText(prompt, ["move to doing", "work on", "start", "begin"])
    };
  }

  if (/\b(plan|schedule|organize|prioritize|focus)\b/.test(lower)) {
    return { type: "plan" };
  }

  if (/\b(summary|summarize|status|priority|priorities|overview)\b/.test(lower)) {
    return { type: "summary" };
  }

  if (/\b(next|what now|what should i do)\b/.test(lower)) {
    return { type: "next" };
  }

  if (/\b(routine|habit|ritual)\b/.test(lower)) {
    return { type: "routine" };
  }

  if (/\b(add|create|new task|task|todo|to-do|need to|i have to|i should|please)\b/.test(lower)) {
    return {
      type: "task",
      title: cleanupTaskTitle(prompt),
      priority: inferPriority(lower),
      due: time || ""
    };
  }

  return { type: "coach" };
}

function cleanupCommandText(value, prefixes) {
  let text = value.trim();
  prefixes.forEach((prefix) => {
    text = text.replace(new RegExp(`^${escapeRegExp(prefix)}\\s*`, "i"), "");
  });
  return removeTimeText(text).replace(/\s+/g, " ").trim();
}

function cleanupTaskTitle(value) {
  return removeTimeText(value)
    .replace(/^(please\s+)?(add|create|new task|task|todo|to-do)\s*/i, "")
    .replace(/^(i need to|need to|i have to|i should)\s*/i, "")
    .replace(/\b(high|medium|low|urgent|important|minor|someday)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removeTimeText(value) {
  return value
    .replace(/\b(at|by|around)\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, "")
    .replace(/\b\d{1,2}(:\d{2})\b/g, "")
    .trim();
}

function extractTime(value) {
  const match = value.match(/\b(?:at|by|around)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return "";

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3]?.toLowerCase();

  if (hours > 24 || minutes > 59) return "";
  if (period === "pm" && hours < 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;
  if (!period && hours < 7) hours += 12;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function inferPriority(lower) {
  if (/\b(high|urgent|important|critical|asap)\b/.test(lower)) return "high";
  if (/\b(low|minor|someday|later|nice to have)\b/.test(lower)) return "low";
  return "medium";
}

function findTaskByText(text) {
  const needle = text.toLowerCase().trim();
  const openTasks = state.tasks.filter((task) => task.status !== "done");
  return openTasks.find((task) => task.title.toLowerCase().includes(needle))
    || openTasks.find((task) => needle.includes(task.title.toLowerCase()))
    || openTasks.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))[0];
}

function buildPlanReply() {
  const tasks = sortedOpenTasks();
  if (!tasks.length) return "Your task board is clear. Keep one light admin block and leave space for anything unexpected.";

  const top = tasks.slice(0, 3);
  const first = top[0];
  const schedule = top
    .map((task, index) => `${addMinutes(state.settings.dayStart, index * 75)} - ${task.title} (${task.priority})`)
    .join("\n");
  const batchCount = Math.max(0, tasks.length - top.length);

  return `Best plan:\n${schedule}\n\nStart with "${first.title}". ${batchCount ? `Batch the remaining ${batchCount} task${batchCount === 1 ? "" : "s"} after that.` : "After that, keep the board clean."}`;
}

function buildSummaryReply() {
  const open = state.tasks.filter((task) => task.status !== "done");
  const high = open.filter((task) => task.priority === "high");
  const doing = open.filter((task) => task.status === "doing");
  const nextRoutine = state.routines.find((routine) => !routine.done);
  const due = open.filter((task) => task.due).sort((a, b) => a.due.localeCompare(b.due));

  return [
    `Open tasks: ${open.length}`,
    `High priority: ${high.length}${high[0] ? ` - ${high[0].title}` : ""}`,
    `In progress: ${doing.length}${doing[0] ? ` - ${doing[0].title}` : ""}`,
    `Next timed item: ${due[0] ? `${due[0].due} - ${due[0].title}` : "none"}`,
    `Next routine: ${nextRoutine ? nextRoutine.title : "all complete"}`
  ].join("\n");
}

function buildNextActionReply() {
  const doing = state.tasks.find((task) => task.status === "doing");
  if (doing) return `Keep momentum on "${doing.title}". Finish or park it before opening a new task.`;

  const nextTask = sortedOpenTasks()[0];
  if (nextTask) return `Next action: start "${nextTask.title}". Give it a focused 25-minute pass.`;

  const nextRoutine = state.routines.find((routine) => !routine.done);
  return nextRoutine ? `Next action: ${nextRoutine.title}. ${nextRoutine.detail}.` : "Nothing urgent is waiting. Do a short review and choose tomorrow's first task.";
}

function buildCoachReply(prompt) {
  const open = sortedOpenTasks();
  if (!open.length) return "I do not see an open task yet. Say something like: add task send invoice by 5pm high.";

  return `I heard: "${prompt}". I can act fastest if you phrase it as a task, reminder, note, plan, summary, next action, or routine request. Your current best next task is "${open[0].title}".`;
}

function sortedOpenTasks() {
  return [...state.tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority) || (a.due || "99:99").localeCompare(b.due || "99:99"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function priorityWeight(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 1;
}

function addMinutes(time, minutes) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function exportState() {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daypilot-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.assistantForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const prompt = elements.assistantInput.value.trim();
  if (!prompt) return;
  state.messages.push({ role: "user", text: prompt });
  state.messages.push({ role: "assistant", text: assistantReply(prompt) });
  elements.assistantInput.value = "";
  render();
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(elements.taskTitle.value, elements.taskPriority.value, elements.taskDue.value);
  elements.taskForm.reset();
  elements.taskPriority.value = "medium";
  showToast("Task added");
  render();
});

elements.taskColumns.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const task = state.tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "delete") {
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
  } else {
    task.status = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
  }
  render();
});

elements.saveNoteButton.addEventListener("click", () => {
  const body = elements.noteInput.value.trim();
  if (!body) return;
  state.notes.push({ id: crypto.randomUUID(), body, createdAt: Date.now() });
  elements.noteInput.value = "";
  showToast("Note saved");
  render();
});

elements.reminderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.reminders.push({
    id: crypto.randomUUID(),
    text: elements.reminderText.value.trim(),
    time: elements.reminderTime.value
  });
  elements.reminderForm.reset();
  showToast("Reminder added");
  render();
});

elements.routineGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-routine]");
  if (!button) return;
  const routine = state.routines.find((item) => item.id === button.dataset.routine);
  routine.done = !routine.done;
  render();
});

elements.clearChatButton.addEventListener("click", () => {
  state.messages = structuredClone(defaultState.messages);
  render();
});

elements.rebalanceButton.addEventListener("click", () => {
  state.tasks = state.tasks.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
  showToast("Schedule rebalanced");
  render();
});

elements.planButton.addEventListener("click", () => {
  state.messages.push({ role: "user", text: "Plan my day" });
  state.messages.push({ role: "assistant", text: assistantReply("plan my day") });
  render();
  document.querySelector("#today").scrollIntoView({ block: "start" });
});

elements.exportButton.addEventListener("click", exportState);

elements.menuButton.addEventListener("click", () => {
  document.body.classList.toggle("nav-open");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  });
});

elements.saveSettingsButton.addEventListener("click", () => {
  state.settings = {
    provider: elements.providerSelect.value,
    apiKey: elements.apiKeyInput.value.trim(),
    dayStart: elements.dayStartInput.value || "09:00",
    dayEnd: elements.dayEndInput.value || "18:00"
  };
  showToast("Settings saved");
  render();
});

render();
