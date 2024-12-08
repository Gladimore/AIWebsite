// Constants and UI Elements
const UI = {
  outputDiv: document.getElementById("outputDiv"),
  outputMessage: document.getElementById("output"),
  userInput: document.getElementById("userInput"),
  sendMessageBtn: document.getElementById("sendMessageBtn"),
  passwordInput: document.getElementById("password"),
  copyButton: document.getElementById("copyButton"),
  modelSelector: document.getElementById("modelSelector"),
  settingsDiv: document.getElementById("settings"),
  streamCheckBox: document.getElementById("streamCheckbox"),
  fileUpload: document.getElementById("fileUpload"),
};

const SETTINGS_CONFIG = [
  {
    label: "Max Tokens (Max Length):",
    value: 512,
    variable: "max_tokens",
    min: 1,
    max: 10000,
    type: "number",
  },
  {
    label: "Temperature (Randomness):",
    value: 0.7,
    variable: "temperature",
    min: 0,
    max: 1,
    type: "number",
    step: 0.01,
  },
];

const baseUrl = "https://llm-2-0.vercel.app";
let responseText = "";
let db = false;

// Initialize FilePond and Client
const pond = FilePond.create(UI.fileUpload);
const client = new TogetherClient();
UI.streamCheckBox.checked = true;

// Settings Management
function initializeSettings() {
  SETTINGS_CONFIG.forEach(createSettingElement);
  UI.settingsDiv.appendChild(UI.modelSelector);
}

function createSettingElement(setting) {
  const input = document.createElement("input");
  const label = document.createElement("label");

  Object.assign(input, {
    max: setting.max,
    min: setting.min,
    step: setting.step,
    type: setting.type,
    value: setting.value,
    id: setting.variable,
    className: "setting-input",
  });

  Object.assign(label, {
    innerText: setting.label,
    for: setting.variable,
  });

  UI.settingsDiv.append(
    label,
    input,
    document.createElement("br"),
    document.createElement("br")
  );
}

// API and Data Handling
async function getApiKey(password) {
  const res = await fetch("https://together-key.vercel.app/api", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: password })
  });
  return await res.json();
}

async function loadModels() {
  try {
    const response = await fetch(`${baseUrl}/api/models`);
    const data = await response.json();
    data.forEach(({ model }) => {
      const option = document.createElement("option");
      option.value = model;
      option.text = model;
      UI.modelSelector.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading models:", error);
  }
}

// Message Handling
function onTextReceived(text) {
  responseText += text;
  UI.outputMessage.innerHTML = marked.parse(responseText);
}

function getSettings() {
  const settings = {};
  document.querySelectorAll(".setting-input").forEach((input) => {
    settings[input.id] = input.type === "number" ? parseFloat(input.value) : input.value;
  });
  return settings;
}

// UI Updates and Notifications
function updateCodeBlocks() {
  document.querySelectorAll("code").forEach((block) => {
    const languageClass = block.className;
    const parent = block.parentElement;
    if (parent.nodeName == "PRE" && !parent.classList.contains(languageClass) && languageClass != "") {
      parent.classList.add(languageClass);
      Prism.highlightElement(parent);
    }
  });
}

function displayEndMessage() {
  const endMessage = document.createElement("p");
  endMessage.className = "end";
  endMessage.textContent = "Stream has ended.";
  UI.outputDiv.appendChild(endMessage);
}

function onDone() {
  updateCodeBlocks();
  displayEndMessage();
}

// Error Handling
function displayError(message) {
  const errorMessage = document.createElement("p");
  errorMessage.className = "error";
  errorMessage.textContent = message;
  UI.outputDiv.appendChild(errorMessage);
}

function swalError(message) {
  swal({
    title: "Error",
    text: message,
    icon: "error",
    button: "OK",
  });
}

function clearNotifications() {
  document.querySelectorAll(".end, .error").forEach((el) => el.remove());
}

// File Handling
async function readFiles() {
  const files = pond.getFiles();
  const array = Array.from(files);
  let readFiles = {};

  const readPromises = array.map(({ file }) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        readFiles[file.name] = event.target.result;
        resolve();
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  });

  await Promise.all(readPromises);
  return readFiles;
}

// Main Message Handler
async function handleSendMessage() {
  if (db) {
    swalError("Wait until this is completed");
    return;
  }

  db = true;
  clearNotifications();
  responseText = "";
  UI.outputMessage.innerHTML = "";
  UI.copyButton.style.visibility = "visible";

  if (!client.apiKey) {
    const password = UI.passwordInput.value;
    const { key } = await getApiKey(password);
    if (key) {
      client.apiKey = key;
    } else {
      swalError("Invalid password");
      return;
    }
  }

  const userMessage = UI.userInput.value.trim();
  if (!userMessage) {
    swalError("Please enter a message.");
    return;
  }

  const streamValue = UI.streamCheckBox.checked;
  const files = await readFiles();

  const requestBody = {
    messages: [
      ...Object.entries(files).map(([name, content]) => ({
        role: "user",
        content: `${name}: ${content}`,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ],
    model: UI.modelSelector.value,
    stream: streamValue,
    ...getSettings(),
  };

  try {
    const callbacks = {
      onDone,
      onTextReceived
    };
    await client.send(requestBody, callbacks);
  } catch (error) {
    console.error("Fetch error:", error);
    displayError("Failed to fetch the stream.");
  } finally {
    db = false;
  }
}

// Clipboard Functionality
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(responseText);
    swal({
      title: "Text Copied!",
      icon: "success",
    });
  } catch (err) {
    swalError("Could not copy text:" + err.message);
    console.error("Could not copy text:", err);
  }
}

// Initialize Application
initializeSettings();
loadModels();
UI.sendMessageBtn.addEventListener("click", handleSendMessage);
UI.copyButton.addEventListener("click", copyToClipboard);