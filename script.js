class AI {
  constructor(baseUrl, model, key) {
    this.apiUrl = baseUrl + "/api/chat"
    this.model = model
    this.key = key
  }

  async send(chatMessages = []) {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatMessages,
          model: this.model,
          key: this.key,
        }),
      })
      
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      return data
    } catch (error) {
      return {
        error: error.message || "An error occurred while processing your request",
      }
    }
  }
}

const form = document.querySelector("form")
const promptElement = document.getElementById("prompt")
const passwordElement = document.getElementById("password")
const responseElement = document.getElementById("response")
const selectElement = document.getElementById("models")
const baseUrl = "https://llm-2-0.vercel.app"

let ai = null
let isProcessing = false
let aiResponse = null

const chatMessages = [{
  role: "system",
  content: "Keep your answer short and simple, while also showing how you got that answer.",
}]

async function getModels() {
  try {
    const response = await fetch(`${baseUrl}/api/models`)
    const data = await response.json()
    
    data.forEach(model => {
      const option = document.createElement("option")
      option.value = model.model
      option.textContent = model.model
      selectElement.appendChild(option)
    })
  } catch (error) {
    console.error('Failed to fetch models:', error)
  }
}

async function submit(e) {
  e.preventDefault()
  
  if (isProcessing) {
    alert("Please wait until the previous message is processed.")
    return
  }
  
  isProcessing = true
  ai = new AI(baseUrl, selectElement.value, passwordElement.value)

  try {
    const prompt = promptElement.value
    const messages = [
      ...chatMessages,
      {
        role: "user",
        content: prompt,
      },
    ]

    const res = await ai.send(messages)
    aiResponse = res

    responseElement.innerHTML = res.error 
      ? `<div class="error">${res.error}</div>`
      : marked.parse(res)
      
  } catch (error) {
    responseElement.innerHTML = `<div class="error">An unexpected error occurred</div>`
  } finally {
    isProcessing = false
  }
}

function copyResponse() {
  const text = responseElement.innerText
  if (!text) {
    alert("No text to copy.")
    return
  }

  navigator.clipboard.writeText(text)
    .then(() => alert("Text copied to clipboard!"))
    .catch(err => console.error("Failed to copy text:", err))
}

// Initialize
getModels()

// Event listeners
responseElement.addEventListener("click", copyResponse)
form.addEventListener("submit", submit)
