(function () {
  const pubsub = window.pubsub;

  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatOutput = document.getElementById("chatOutput");
  const chatStatus = document.getElementById("chatStatus");

  function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      pubsub.publish("chat:message", message);
      appendOutput(`You: ${message}`);
      chatInput.value = "";
    }
  }

  function appendOutput(message) {
    const div = document.createElement("div");
    div.textContent = message;
    chatOutput.appendChild(div);
    chatOutput.scrollTop = chatOutput.scrollHeight;
  }

  pubsub.subscribe("diagram:updated", (data) => {
    appendOutput(`Diagram updated: ${JSON.stringify(data)}`);
  });

  pubsub.subscribe("config:changed", (data) => {
    appendOutput(`Config changed: ${JSON.stringify(data)}`);
  });

  chatSendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  pubsub.publish("chat:initialized", { status: "ready" });
})();
