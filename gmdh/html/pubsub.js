
// logger.js

window.logEvent = function(message, data = null) {
    console.log(`Log: ${message}`, data);
    const logOutput = document.getElementById('logOutput');
    if (!logOutput) {
        console.error('Logger: logOutput element not found.');
        return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `<strong>${new Date().toLocaleTimeString()}:</strong> ${message}`;
    if (data) {
        logEntry.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    logOutput.appendChild(logEntry);
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("Attaching logEvent to window");
    if (typeof window.logEvent !== 'function') {
        window.logEvent = function(msg, data) {
            console.warn("Fallback logEvent: ", msg, data);
        };
    }
});
