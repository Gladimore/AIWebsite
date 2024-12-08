class TogetherClient {
  constructor(TOGETHER_API_KEY) {
    this.apiKey = TOGETHER_API_KEY;
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
    this.apiEndpoint = "https://api.together.xyz/v1/chat/completions";
  }

  async send(body, callbacks = { onTextReceived: () => {}, onDone: () => {} }) {
    this.headers.Authorization = `Bearer ${this.apiKey}`;
    this.callbacks = callbacks;

    const response = await fetch(this.apiEndpoint, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (body.stream) {
      await this.handleStreamResponse(response);
    } else {
      await this.handleNormalResponse(response);
    }
  }

  async handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();

        // Check if stream is done
        if (done) {
          // Process any remaining buffer data
          if (buffer) {
            this.processLine(buffer);
          }
          this.callbacks.onDone();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          this.processLine(line);
        }
      }
    } catch (error) {
      console.error("Stream reading error:", error);
      throw error;
    }
  }

  processLine(line) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6).trim();

      if (jsonStr === "[DONE]") {
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.choices?.[0]?.delta?.content) {
          this.callbacks.onTextReceived(parsed.choices[0].delta.content);
        }
      } catch (err) {
        console.error("Error parsing JSON:", err);
      }
    }
  }

  async handleNormalResponse(response) {
    const json = await response.json();
    const text = json.choices[0].message.content;
    this.callbacks.onTextReceived(text);
    this.callbacks.onDone();
  }
}
