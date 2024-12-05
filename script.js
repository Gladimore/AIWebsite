// DOM Elements
const UI = {
  outputDiv: document.getElementById("outputDiv"),
  outputMessage: document.getElementById("output"),
  userInput: document.getElementById("userInput"),
  sendMessageBtn: document.getElementById("sendMessageBtn"),
  passwordInput: document.getElementById("password"),
  copyButton: document.getElementById("copyButton"),
  modelSelector: document.getElementById("modelSelector"),
  settingsDiv: document.getElementById("settings"),
}

// Settings Configuration
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
]

let responseText = ""

// Initialize Settings
function initializeSettings() {
  SETTINGS_CONFIG.forEach(createSettingElement)
  UI.settingsDiv.appendChild(UI.modelSelector)
}

function createSettingElement(setting) {
  const input = document.createElement("input")
  const label = document.createElement("label")

  Object.assign(input, {
    max: setting.max,
    min: setting.min,
    step: setting.step,
    type: setting.type,
    value: setting.value,
    id: setting.variable,
    className: "setting-input",
  })

  Object.assign(label, {
    innerText: setting.label,
    for: setting.variable,
  })

  UI.settingsDiv.append(
    label,
    input,
    document.createElement("br"),
    document.createElement("br"),
  )
}

function getSettings() {
  const settings = {}
  document.querySelectorAll(".setting-input").forEach((input) => {
    settings[input.id] =
      input.type === "number" ? parseFloat(input.value) : input.value
  })
  return settings
}

// Load Available Models
async function loadModels() {
  try {
    const response = await fetch("https://llm-2-0.vercel.app/api/models")
    const data = await response.json()

    data.forEach(({ model }) => {
      const option = document.createElement("option")
      option.value = model
      option.text = model
      UI.modelSelector.appendChild(option)
    })
  } catch (error) {
    console.error("Error loading models:", error)
  }
}

async function processStreamChunk(reader, decoder) {
  try {
    const { done, value } = await reader.read()
    
    if (done) {
      displayEndMessage()
      return
    }

    UI.outputMessage.scrollIntoView();

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n").filter((line) => line.trim())
    lines.forEach(processLine)

    // Recursively process the next chunk
    await processStreamChunk(reader, decoder)
  } catch (error) {
    console.error("Error processing stream chunk:", error)
    displayError("Error processing response")
  }
}

function processLine(line) {
  try {
    const data = JSON.parse(line)
    if (data.content) {
      responseText += data.content
      UI.outputMessage.innerHTML = marked.parse(responseText)
    } else if (data.error) {
      displayError(`Error: ${data.error}`)
    }
  } catch (err) {
    console.error("Error parsing chunk:", err)
  }
}

// UI Display Functions
function displayEndMessage() {
  const endMessage = document.createElement("p")
  endMessage.className = "end"
  endMessage.textContent = "Stream has ended."
  UI.outputDiv.appendChild(endMessage)
}

function displayError(message) {
  const errorMessage = document.createElement("p")
  errorMessage.className = "error"
  errorMessage.textContent = message
  UI.outputDiv.appendChild(errorMessage)
}

function clearNotifications() {
  document.querySelectorAll(".end, .error").forEach(el => el.remove())
}

// Event Handlers
async function handleSendMessage() {
  console.log("called")
  clearNotifications()
  responseText = ""
  UI.outputMessage.innerHTML = ""
  UI.copyButton.style.visibility = "visible"

  const userMessage = UI.userInput.value.trim()
  if (!userMessage) {
    alert("Please enter a message.")
    return
  }

  UI.outputMessage.innerHTML = ""

  const requestBody = {
    messages: [{ role: "user", content: userMessage }],
    model: UI.modelSelector.value,
    stream: true,
    ...getSettings(),
  }

  try {
    const response = await fetch("https://llm-2-0.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        REQUEST: requestBody,
        PASSWORD: UI.passwordInput.value.trim(),
      }),
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    await processStreamChunk(reader, decoder)
  } catch (error) {
    console.error("Fetch error:", error)
    displayError("Failed to fetch the stream.")
  } finally {
    UI.userInput.value = ""
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(responseText)
    swal({
      title: "Text Copied!",
      icon: "success",
    })
  } catch (err) {
    swal({
      title: "Could not copy text:" + err.message,
      icon: "error",
    })
    console.error("Could not copy text:", err)
  }
}

// Initialize Application
initializeSettings()
loadModels()
UI.sendMessageBtn.addEventListener("click", handleSendMessage)
UI.copyButton.addEventListener("click", copyToClipboard)