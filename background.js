// background.js
// Service worker that listens for tab events and closes blacklisted sites during an active session.

const DEFAULTS = {
  enabled: true,
  blacklist: ["facebook.com", "instagram.com", "youtube.com", "twitter.com"],
  defaultDurationMinutes: 60 * 1 // default 1 hour if not set in options
};

// Utility: initialize defaults on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled", "blacklist", "defaultDurationMinutes"], (items) => {
    const toSet = {};
    if (items.enabled === undefined) toSet.enabled = DEFAULTS.enabled;
    if (!items.blacklist) toSet.blacklist = DEFAULTS.blacklist;
    if (!items.defaultDurationMinutes) toSet.defaultDurationMinutes = DEFAULTS.defaultDurationMinutes;
    if (Object.keys(toSet).length) chrome.storage.local.set(toSet);
  });
});

// Helper: is URL host matched by blacklist entry?
function hostMatchesBlacklist(host, blacklist) {
  host = host.toLowerCase();
  for (const entry of (blacklist || [])) {
    const b = (entry || "").trim().toLowerCase();
    if (!b) continue;
    // exact host or subdomain match
    if (host === b || host.endsWith("." + b)) return true;
  }
  return false;
}

function isWebUrl(url) {
  try {
    return url.startsWith("http://") || url.startsWith("https://");
  } catch (e) {
    return false;
  }
}

// Called when a tab's URL changes or a tab is created
function handlePotentiallyBlockedTab(tabId, url) {
  if (!url || !isWebUrl(url)) return;

  chrome.storage.local.get(["enabled", "sessionActive", "sessionEnd", "blacklist"], (data) => {
    if (!data.enabled) return;
    if (!data.sessionActive) return;
    if (!data.blacklist) data.blacklist = [];

    // if url host is in blacklist, close the tab and notify
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      if (hostMatchesBlacklist(host, data.blacklist)) {
        // compute minutes left
        const now = Date.now();
        const end = data.sessionEnd || now;
        let minutesLeft = Math.ceil((end - now) / (60 * 1000));
        if (minutesLeft < 0) minutesLeft = 0;

        // close tab
        // chrome.tabs.remove(tabId, () => {
        //   // notify user (simple notification)
        //   const message = minutesLeft > 0
        //     ? `Don't get distracted by ${host}. ${minutesLeft} minute(s) left in your session.`
        //     : `Don't get distracted by ${host}. Keep focusing!`;

        //   chrome.notifications.create({
        //     type: "basic",
        //     iconUrl: "icons/icon128.png",
        //     title: "Stay focused!",
        //     message
        //   });
        // });

        chrome.tabs.update(tabId, {
          url: chrome.runtime.getURL("stay_focused.html")
        });


        // redirect tab to our stay_focused.html page





      }
    } catch (e) {
      // invalid URL — ignore
    }
  });
}

// Listen to URL updates (navigations)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handlePotentiallyBlockedTab(tabId, changeInfo.url);
  }
});

// Listen to created tabs (some navigations start as created)
chrome.tabs.onCreated.addListener((tab) => {
  // Chrome may give a 'pendingUrl' or 'url'
  if (tab.pendingUrl) handlePotentiallyBlockedTab(tab.id, tab.pendingUrl);
  if (tab.url) handlePotentiallyBlockedTab(tab.id, tab.url);
});

// Start a study session for durationMinutes (integer)
function startSession(durationMinutes) {
  if (!durationMinutes || durationMinutes <= 0) return;
  const end = Date.now() + durationMinutes * 60 * 1000;

  chrome.storage.local.set({ sessionActive: true, sessionEnd: end }, () => {
    // create an alarm for session end
    chrome.alarms.create("session_end", { when: end });
    // create a repeating alarm to update badge every minute
    chrome.alarms.create("session_tick", { periodInMinutes: 1 });
    updateBadge(); // immediate badge update
  });
}

// End the current session
function endSession() {
  chrome.storage.local.set({ sessionActive: false, sessionEnd: null }, () => {
    chrome.alarms.clear("session_end");
    chrome.alarms.clear("session_tick");
    chrome.action.setBadgeText({ text: "" });
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Study session finished",
      message: "Nice! Your distraction block session has ended."
    });
  });
}

function minutesRemainingFromEnd(endTimestamp) {
  const msLeft = endTimestamp - Date.now();
  return Math.max(0, Math.ceil(msLeft / (60 * 1000)));
}

function niceBadgeText(minutesLeft) {
  if (minutesLeft <= 0) return "";
  if (minutesLeft >= 60) {
    const hours = Math.ceil(minutesLeft / 60);
    return `${hours}h`;
  }
  return `${minutesLeft}m`;
}

// Update the extension badge to show remaining time
function updateBadge() {
  chrome.storage.local.get(["sessionActive", "sessionEnd"], (data) => {
    if (!data.sessionActive || !data.sessionEnd) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }
    const minutesLeft = minutesRemainingFromEnd(data.sessionEnd);
    const text = niceBadgeText(minutesLeft);
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#d32f2f" });
    if (minutesLeft <= 0) {
      // session expired: clean up
      endSession();
    }
  });
}

// Alarm handler: end session or tick
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "session_end") {
    endSession();
  } else if (alarm.name === "session_tick") {
    updateBadge();
  }
});

// Ensure alarms & badge restored when service worker starts
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["sessionActive", "sessionEnd"], (data) => {
    if (data.sessionActive && data.sessionEnd && data.sessionEnd > Date.now()) {
      chrome.alarms.create("session_end", { when: data.sessionEnd });
      chrome.alarms.create("session_tick", { periodInMinutes: 1 });
      updateBadge();
    } else {
      // cleanup stale session info
      chrome.storage.local.set({ sessionActive: false, sessionEnd: null }, () => {
        chrome.action.setBadgeText({ text: "" });
      });
    }
  });
});

// Also run on service worker startup (in practice onInstalled/onStartup cover it)
(function init() {
  chrome.storage.local.get(["sessionActive", "sessionEnd"], (data) => {
    if (data.sessionActive && data.sessionEnd && data.sessionEnd > Date.now()) {
      chrome.alarms.create("session_end", { when: data.sessionEnd });
      chrome.alarms.create("session_tick", { periodInMinutes: 1 });
      updateBadge();
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
})();

// Respond to popup/options messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === "startSession") {
    const minutes = message.durationMinutes;
    startSession(minutes);
    sendResponse({ ok: true });
  } else if (message.action === "stopSession") {
    endSession();
    sendResponse({ ok: true });
  } else if (message.action === "getStatus") {
    chrome.storage.local.get(["enabled", "sessionActive", "sessionEnd", "blacklist", "defaultDurationMinutes"], (data) => {
      sendResponse(data);
    });
    return true; // indicate async response
  }
});
