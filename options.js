// options.js
const enabledCheckbox = document.getElementById("enabled");
const newDomainInput = document.getElementById("newDomain");
const addDomainBtn = document.getElementById("addDomain");
const blacklistUl = document.getElementById("blacklist");
const saveBtn = document.getElementById("save");
const statusSpan = document.getElementById("status");
const defaultHours = document.getElementById("defaultHours");
const defaultMinutes = document.getElementById("defaultMinutes");

function renderBlacklist(list) {
  blacklistUl.innerHTML = "";
  (list || []).forEach((d, idx) => {
    const li = document.createElement("li");
    li.textContent = d + " ";
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.addEventListener("click", () => {
      list.splice(idx, 1);
      renderBlacklist(list);
    });
    li.appendChild(rm);
    blacklistUl.appendChild(li);
  });
}

function loadOptions() {
  chrome.storage.local.get(["enabled", "blacklist", "defaultDurationMinutes"], (data) => {
    enabledCheckbox.checked = data.enabled !== false;
    const list = data.blacklist || [];
    renderBlacklist(list);
    const dm = data.defaultDurationMinutes || 25;
    defaultHours.value = Math.floor(dm / 60);
    defaultMinutes.value = dm % 60;
  });
}

addDomainBtn.addEventListener("click", () => {
  const v = (newDomainInput.value || "").trim();
  if (!v) return;
  // simple sanitize: remove protocol + trailing slash
  const sanitized = v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  // append to current list
  chrome.storage.local.get(["blacklist"], (data) => {
    const list = data.blacklist || [];
    if (!list.includes(sanitized)) {
      list.push(sanitized);
      chrome.storage.local.set({ blacklist: list }, () => {
        renderBlacklist(list);
        newDomainInput.value = "";
      });
    } else {
      alert("Domain is already in the blacklist.");
    }
  });
});

saveBtn.addEventListener("click", () => {
  const hours = Math.max(0, parseInt(defaultHours.value || "0", 10));
  const minutes = Math.max(0, parseInt(defaultMinutes.value || "0", 10));
  const total = hours * 60 + minutes;
  if (!total || total <= 0) {
    statusSpan.textContent = "Enter a valid default duration.";
    return;
  }

  // read the current rendered blacklist
  const list = [];
  for (const li of blacklistUl.querySelectorAll("li")) {
    const text = li.childNodes[0].textContent.trim();
    if (text) list.push(text);
  }

  chrome.storage.local.set({
    enabled: enabledCheckbox.checked,
    blacklist: list,
    defaultDurationMinutes: total
  }, () => {
    statusSpan.textContent = "Options saved.";
    setTimeout(() => statusSpan.textContent = "", 2000);
  });
});

loadOptions();
