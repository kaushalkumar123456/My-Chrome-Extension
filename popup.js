// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const hoursInput = document.getElementById("hours");
  const minutesInput = document.getElementById("minutes");
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const statusDiv = document.getElementById("status");
  const openOptions = document.getElementById("openOptions");

  function refreshStatus() {
    chrome.runtime.sendMessage({ action: "getStatus" }, (data) => {
      if (!data) {
        statusDiv.textContent = "Unable to read status.";
        return;
      }
      if (!data.enabled) {
        statusDiv.textContent = "Extension is disabled in options.";
      } else if (data.sessionActive && data.sessionEnd) {
        const msLeft = data.sessionEnd - Date.now();
        const mins = Math.max(0, Math.ceil(msLeft / (60 * 1000)));
        let text = `${mins} minute(s) left`;
        if (mins >= 60) text = `${Math.ceil(mins/60)} hour(s) left`;
        statusDiv.textContent = `Session active — ${text}`;
      } else {
        statusDiv.textContent = "No active session.";
      }
      // Pre-fill default duration
      if (data.defaultDurationMinutes) {
        const dm = data.defaultDurationMinutes;
        const h = Math.floor(dm / 60);
        const m = dm % 60;
        // only set fields if they are still the defaults
        if (hoursInput.value === "0" && minutesInput.value === "25") {
          hoursInput.value = h;
          minutesInput.value = m || 0;
        }
      }
    });
  }

  startBtn.addEventListener("click", () => {
    const hours = Math.max(0, parseInt(hoursInput.value || "0", 10));
    const minutes = Math.max(0, parseInt(minutesInput.value || "0", 10));
    const total = hours * 60 + minutes;
    if (!total || total <= 0) {
      alert("Enter a session duration (hours or minutes).");
      return;
    }
    chrome.runtime.sendMessage({ action: "startSession", durationMinutes: total }, () => {
      window.close(); // close popup right away
    });
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "stopSession" }, () => {
      refreshStatus();
    });
  });

  openOptions.addEventListener("click", (e) => {
    e.preventDefault();
    // open options page in a new tab
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open("options.html");
    }
  });

  refreshStatus();
  // refresh periodically while popup is open
  setInterval(refreshStatus, 1000 * 10);
});
