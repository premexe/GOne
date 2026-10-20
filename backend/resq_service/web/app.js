let ws = null;
let recognition = null;
let isCalling = false;
let currentPatientId = "PAT-101";

// Audio Echo Shield State
let isAssistantSpeaking = false;
let lastAssistantPhrases = [];
let speechDebounceTimer = null;
let pendingSpeech = "";
let availableVoices = [];
let queuedMessages = [];

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  availableVoices = window.speechSynthesis.getVoices();
}
loadVoices();
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

const callBtn = document.getElementById("callBtn");
const callBtnLabel = document.getElementById("callBtnLabel");
const chatFeed = document.getElementById("chatFeed");
const emergencyTypeEl = document.getElementById("emergencyType");
const severityLevelEl = document.getElementById("severityLevel");
const detectedLanguageEl = document.getElementById("detectedLanguage");
const handoverStatusEl = document.getElementById("handoverStatus");
const providerBadgeEl = document.getElementById("providerBadge");
const manualInput = document.getElementById("manualInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const patientSelect = document.getElementById("patientSelect");
const speechLanguage = document.getElementById("speechLanguage");

const pAllergies = document.getElementById("pAllergies");
const pConditions = document.getElementById("pConditions");
const pMeds = document.getElementById("pMeds");

function pickIndianVoice(lang) {
  if (!availableVoices || availableVoices.length === 0) {
    loadVoices();
  }

  if (lang === "hi" || lang === "hinglish") {
    const hindiVoice = availableVoices.find(v => 
      (v.lang === "hi-IN" || v.lang === "hi_IN" || v.lang.startsWith("hi")) &&
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Swara") || v.name.includes("Heera") || v.name.includes("Kalpana"))
    ) || availableVoices.find(v => v.lang.startsWith("hi"));

    if (hindiVoice) return hindiVoice;
  }

  const indianEnglishVoice = availableVoices.find(v => 
    (v.lang === "en-IN" || v.lang === "en_IN") &&
    (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Neerja") || v.name.includes("Prabhat"))
  ) || availableVoices.find(v => v.lang === "en-IN" || v.lang === "en_IN");

  if (indianEnglishVoice) return indianEnglishVoice;
  return availableVoices.find(v => v.lang.startsWith(lang === "hi" ? "hi" : "en")) || null;
}

// Check if incoming text shares > 40% words with nurse's recent messages
function isSelfEcho(transcript) {
  if (!transcript || lastAssistantPhrases.length === 0) return false;

  const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const userWords = normalize(transcript);
  if (userWords.length === 0) return false;

  for (const assistantText of lastAssistantPhrases) {
    const assistantWords = new Set(normalize(assistantText));
    let matchCount = 0;

    for (const word of userWords) {
      if (assistantWords.has(word)) {
        matchCount++;
      }
    }

    const similarity = matchCount / userWords.length;
    if (similarity >= 0.45) { // 45% se zyada matching words hone par block
      console.warn("Echo detected aur drop kar diya gaya:", transcript, "Similarity:", similarity);
      return true;
    }
  }

  return false;
}

function speakResponse(text, lang) {
  if (!('speechSynthesis' in window)) return;

  // Track nurse response history
  lastAssistantPhrases.push(text);
  if (lastAssistantPhrases.length > 3) lastAssistantPhrases.shift();

  isAssistantSpeaking = true;
  clearTimeout(speechDebounceTimer);
  pendingSpeech = "";

  // Mic ko forcefully band karo bolte waqt
  if (recognition) {
    try {
      recognition.abort();
    } catch (e) {}
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickIndianVoice(lang);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = (lang === "hi" || lang === "hinglish") ? "hi-IN" : "en-IN";
  }

  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  // Speak duration ke hisab se safe fallback timer (agar onend fire na ho)
  const approxDurationMs = Math.max((text.split(" ").length / 2.5) * 1000, 2000);

  const enableMicAfterCooldown = () => {
    setTimeout(() => {
      isAssistantSpeaking = false;
      if (isCalling && recognition) {
        try {
          recognition.start();
        } catch (e) {}
      }
    }, 600); // 600ms room echo clearance delay
  };

  utterance.onend = enableMicAfterCooldown;
  utterance.onerror = enableMicAfterCooldown;

  window.speechSynthesis.speak(utterance);

  // Failsafe timer: agar browser onend bhool jaye
  setTimeout(() => {
    if (isAssistantSpeaking) {
      enableMicAfterCooldown();
    }
  }, approxDurationMs + 1000);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendMessage("assistant", "Browser Web Speech API not supported.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  // Browser speech APIs do not provide dependable universal language detection.
  // Auto uses Hindi on Indian devices because it handles Hindi/Hinglish well;
  // the server still detects the transcript language before it generates speech.
  recognition.lang = speechLanguage.value === "auto" ? "hi-IN" : speechLanguage.value;

  recognition.onresult = (event) => {
    // Agar assistant bol raha hai to direct drop
    if (isAssistantSpeaking) {
      return;
    }

    const last = event.results.length - 1;
    const text = event.results[last][0].transcript.trim();

    // Echo check: agar text nurse ke words se match karta hai to drop
    if (!text || isSelfEcho(text)) {
      return;
    }

    pendingSpeech += (pendingSpeech ? " " : "") + text;

    clearTimeout(speechDebounceTimer);
    speechDebounceTimer = setTimeout(() => {
      if (pendingSpeech.trim() && !isAssistantSpeaking && !isSelfEcho(pendingSpeech.trim())) {
        sendSpeechToServer(pendingSpeech.trim());
        pendingSpeech = "";
      }
    }, 700);
  };

  recognition.onerror = (e) => {
    if (e.error !== "aborted") {
      console.warn("Speech recognition notice:", e.error);
    }
  };

  recognition.onend = () => {
    if (isCalling && !isAssistantSpeaking) {
      try {
        recognition.start();
      } catch (err) {}
    }
  };
}

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/emergency`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "INIT",
      patient_id: currentPatientId
    }));
    const messages = queuedMessages;
    queuedMessages = [];
    messages.forEach((text) => sendSpeechToServer(text));
    if (isCalling && recognition && !isAssistantSpeaking) {
      try { recognition.start(); } catch (e) {}
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "SESSION_INITIALIZED") {
      updatePatientUI(data.patient);
      emergencyTypeEl.innerText = data.emergency_type.replace(/_/g, " ").toUpperCase();
      severityLevelEl.innerText = data.severity.toUpperCase();
    }

    if (data.type === "ASSISTANT_RESPONSE") {
      appendMessage("assistant", data.text);
      emergencyTypeEl.innerText = data.emergency_type.replace(/_/g, " ").toUpperCase();
      
      severityLevelEl.innerText = data.severity.toUpperCase();
      severityLevelEl.className = "value badge-" + data.severity;

      detectedLanguageEl.innerText = data.language.toUpperCase();
      providerBadgeEl.innerText = `Engine: ${data.provider_used}`;

      if (data.handover_status === "DISPATCHED" || data.handover_status === "PREVIOUSLY_DISPATCHED") {
        handoverStatusEl.innerText = "ESCALATED / DISPATCHED";
        handoverStatusEl.className = "value badge-dispatched";
      }

      speakResponse(data.text, data.language);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed.");
    ws = null;
    if (isCalling) {
      appendMessage("assistant", "Connection to G-ONE ResQ was lost. Please check the service and start the call again.");
    }
  };
}

function sendSpeechToServer(text) {
  appendMessage("user", text);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "USER_SPEECH",
      text: text
    }));
  } else {
    queuedMessages.push(text);
    if (!ws || ws.readyState === WebSocket.CLOSED) initWebSocket();
  }
}

function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "assistant" ? "RN" : "YOU";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.append(avatar, bubble);
  chatFeed.appendChild(msg);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

function updatePatientUI(patient) {
  pAllergies.innerText = (patient.allergies && patient.allergies.length) ? patient.allergies.join(", ") : "None reported";
  pConditions.innerText = (patient.existing_conditions && patient.existing_conditions.length) ? patient.existing_conditions.join(", ") : "None reported";
  pMeds.innerText = (patient.medications && patient.medications.length) ? patient.medications.join(", ") : "None reported";
}

callBtn.addEventListener("click", () => {
  if (!isCalling) {
    isCalling = true;
    callBtn.className = "call-button stop";
    callBtnLabel.innerText = "End Emergency Call";
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    } else if (recognition) {
      try { recognition.start(); } catch (e) {}
    }
    // Microphone starts from WebSocket onopen, so no first spoken turn is lost.
  } else {
    isCalling = false;
    callBtn.className = "call-button start";
    callBtnLabel.innerText = "Start Emergency Call";
    clearTimeout(speechDebounceTimer);
    pendingSpeech = "";
    if (recognition) {
      try { recognition.abort(); } catch(e){}
    }
    window.speechSynthesis.cancel();
  }
});

sendTextBtn.addEventListener("click", () => {
  const text = manualInput.value.trim();
  if (text) {
    sendSpeechToServer(text);
    manualInput.value = "";
  }
});

manualInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendTextBtn.click();
});

patientSelect.addEventListener("change", (e) => {
  currentPatientId = e.target.value;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "INIT", patient_id: currentPatientId }));
  }
});

speechLanguage.addEventListener("change", () => {
  const restart = isCalling && recognition;
  if (recognition) {
    try { recognition.abort(); } catch (e) {}
  }
  setupSpeechRecognition();
  if (restart && !isAssistantSpeaking) {
    try { recognition.start(); } catch (e) {}
  }
});

setupSpeechRecognition();
initWebSocket();
