const JSONViewer = (() => {
  const viewer = document.getElementById("jsonViewer");

  pubsub.subscribe("state:updated", (data) => {
    viewer.textContent = JSON.stringify(data, null, 2);
  });

  viewer.addEventListener("dragover", (e) => e.preventDefault());
  viewer.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text");
    try {
      const json = JSON.parse(text);
      pubsub.publish("state:updated", json);
    } catch {
      console.error("Invalid JSON dropped");
    }
  });

  return { update: (data) => pubsub.publish("state:updated", data) };
})();
