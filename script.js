// Get the DOM elements
const outputDiv = document.getElementById("output");
const userInput = document.getElementById("userInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const passwordInput = document.getElementById("password");

const modelSelector = document.getElementById("modelSelector");
const settingsDiv = document.getElementById("settings");

const settings = [
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
    step: 0,
  },
];

makeSettings();

function makeSettings() {
  settings.forEach((setting) => {
    const input = document.createElement("input");
    const label = document.createElement("label");

    input.max = setting.max;
    input.min = setting.min;
    input.step = setting.step;
    input.type = setting.type;
    input.value = setting.value;
    input.id = setting.variable;
    input.classList.add("setting-input");

    label.innerText = setting.label;
    label.for = setting.variable;

    settingsDiv.appendChild(label);
    settingsDiv.appendChild(input);

    settingsDiv.appendChild(document.createElement("br"));
    settingsDiv.appendChild(document.createElement("br"));
  });

  settingsDiv.appendChild(modelSelector);
}

function getSettings() {
  let settings = {};
  document.querySelectorAll(`.setting-input`).forEach((input) => {
    if (input.type === "number") {
      settings[input.id] = parseFloat(input.value);
    } else {
      settings[input.id] = input.value;
    }
  });

  return settings;
}

fetch("https://llm-2-0.vercel.app/api/models")
  .then((response) => response.json())
  .then((data) => {
    data.forEach(({ model }) => {
      const option = document.createElement("option");
      option.value = model;
      option.text = model;
      modelSelector.appendChild(option);
    });
  });

// Handle sending the message when the button is clicked
sendMessageBtn.addEventListener("click", () => {
  // Get the user's message and trim it
  const userMessage = userInput.value.trim();

  // Check if the message is empty
  if (!userMessage) {
    alert("Please enter a message.");
    return;
  }

  // Clear the previous chat history
  outputDiv.innerHTML = "";

  // Create a paragraph element to hold the response
  const messageElement = document.createElement("p");
  outputDiv.appendChild(messageElement);

  // Prepare the request body for the POST request
  const requestBody = {
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
    model: modelSelector.value,
    stream: true,
    ...getSettings(),
  };
  const Password = passwordInput.value.trim();

  const body = JSON.stringify({
    REQUEST: requestBody,
    PASSWORD: Password,
  });
  console.log(body);

  // Make the POST request to the chatbot server
  fetch("https://llm-2-0.vercel.app/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body,
  })
    .then((response) => {
      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the ReadableStream reader and a TextDecoder
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let text = ""; // Buffer to store accumulated text

      // Read the stream
      reader.read().then(function processChunk({ done, value }) {
        if (done) {
          // Stream has ended
          const endMessage = document.createElement("p");
          endMessage.className = "end";
          endMessage.textContent = "Stream has ended.";
          outputDiv.appendChild(endMessage);
          return;
        }

        // Decode and parse the chunk
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        lines.forEach((line) => {
          try {
            const data = JSON.parse(line);
            if (data.content) {
              // Append the content to the existing paragraph element
              messageElement.textContent += data.content;
            } else if (data.error) {
              const errorMessage = document.createElement("p");
              errorMessage.className = "error";
              errorMessage.textContent = `Error: ${data.error}`;
              outputDiv.appendChild(errorMessage);
            }
          } catch (err) {
            console.error("Error parsing chunk:", err);
          }
        });

        // Continue reading the stream
        return reader.read().then(processChunk);
      });
    })
    .catch((err) => {
      console.error("Fetch error:", err);
      const errorMessage = document.createElement("p");
      errorMessage.className = "error";
      errorMessage.textContent = "Failed to fetch the stream.";
      outputDiv.appendChild(errorMessage);
    })
    .finally(() => {
      // Clear the input field after sending the message
      userInput.value = "";
    });
});
