// // ===== QUOTES =====
// const quotes = [
//   "“Success is the sum of small efforts repeated day in and day out.”",
//   "“Don’t watch the clock; do what it does. Keep going.”",
//   "“Push yourself, because no one else is going to do it for you.”",
//   "“The future depends on what you do today.”",
//   "“Great things never come from comfort zones.”",
//   "“Stay disciplined. It always pays off.”"
// ];

// let index = 0;
// const quoteElement = document.getElementById("quote");

// function showQuote() {
//   quoteElement.style.opacity = 0;
//   setTimeout(() => {
//     quoteElement.textContent = quotes[index];
//     quoteElement.style.opacity = 1;
//     index = (index + 1) % quotes.length;
//   }, 1000);
// }

// // Show the first quote immediately
// quoteElement.textContent = quotes[index];
// quoteElement.style.opacity = 1;
// index = (index + 1) % quotes.length;
// setInterval(showQuote, 5000);  // ✅ safe


// // ===== TIMER =====
// const timerElement = document.getElementById("timer");

// function formatTime(ms) {
//   if (ms <= 0) return "00:00:00";
//   const totalSeconds = Math.floor(ms / 1000);
//   const hours = Math.floor(totalSeconds / 3600);
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;
//   return [
//     hours.toString().padStart(2, "0"),
//     minutes.toString().padStart(2, "0"),
//     seconds.toString().padStart(2, "0")
//   ].join(":");
// }

// function updateTimer(endTime) {
//   function tick() {
//     const now = Date.now();
//     const msLeft = endTime - now;
//     timerElement.textContent = msLeft > 0
//       ? "Time left: " + formatTime(msLeft)
//       : "Session finished!";
//     if (msLeft > 0) {
//       requestAnimationFrame(tick);
//     }
//   }
//   tick();
// }

// if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
//   chrome.storage.local.get(["sessionEnd"], (data) => {
//     if (data.sessionEnd) {
//       updateTimer(data.sessionEnd);
//     } else {
//       timerElement.textContent = "No active session.";
//     }
//   });
// } else {
//   timerElement.textContent = "Extension not active.";
// }




document.addEventListener("DOMContentLoaded", () => {
  const quotes = [
    "Small progress is still progress.",
    "This moment of focus decides your future.",
    "Discipline today creates freedom tomorrow.",
    "Your future self will thank you for this.",
    "Focus beats motivation when motivation fades.",
    "You didn’t come this far to give up now."
  ];

  const quoteEl = document.getElementById("quote");
  const timerEl = document.getElementById("timer");

  let index = 0;

  function rotateQuote() {
    quoteEl.style.opacity = 0;
    setTimeout(() => {
      quoteEl.textContent = quotes[index];
      quoteEl.style.opacity = 1;
      index = (index + 1) % quotes.length;
    }, 600);
  }

  rotateQuote();
  setInterval(rotateQuote, 5000);

  function format(ms) {
    if (ms <= 0) return "Session finished 🎉";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `Time left: ${h.toString().padStart(2,"0")}:${m
      .toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  }

  chrome.storage.local.get(["sessionEnd"], (data) => {
    if (!data.sessionEnd) {
      timerEl.textContent = "No active session";
      return;
    }

    setInterval(() => {
      timerEl.textContent = format(data.sessionEnd - Date.now());
    }, 1000);
  });
});
