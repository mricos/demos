// Get DOM elements
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");

// Add event listener to the form
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const message = userInput.value.trim();

    if (message) {
        displayMessage(message, "user");
        getResponse(message);
    }

    userInput.value = "";
});

// Function to display a message
function displayMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `${sender}-message`;
    messageDiv.textContent = message;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to get a response from the "AI"
function getResponseOrig(message) {
    // Replace this with your own logic to generate a response
    const response = `You said: ${message}`;

    // Simulate a delay for the response
    setTimeout(() => {
        displayMessage(response, "ai");
    }, 1000);
}
async function getResponse(message) {
    const apiKey ="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";      // client has to have this so envsubst app.js.env > app.js

    try {
        const response = await fetch("https://api.openai.com/v1/engines/text-davinci-002/completions", {

            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                prompt: `User: ${message}\nAI:`,
                max_tokens: 50,
                n: 1,
                stop: null,
                temperature: 0.8,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const chatGptResponse = data.choices[0].text.trim();
            displayMessage(chatGptResponse, "ai");
        } else {
            console.error("Error:", response.status, response.statusText);
            const errorText = await response.text();
            displayMessage(`An error occurred (${response.status}): ${errorText}`, "ai");
        }
    } catch (error) {
        console.error("Error:", error);
        displayMessage(`An error occurred: ${error.message}`, "ai");
    }
}
