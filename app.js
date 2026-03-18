/* ================================================================
   Student Spin Wheel – Enhanced JavaScript
   Author: Himal Paudel  |  COS 506 – Advanced Programming
   ================================================================
   NEW FEATURES (Task A):
     #1 – Dark / Light Theme Toggle
     #2 – Countdown Timer (3-2-1) before spin
     #3 – Winner Spotlight Modal with confetti bar
     #4 – Statistics Panel (pick frequency per student)
     #5 – Weighted Spin (per-student probability weight 1-5)
     #6 – Keyboard Shortcut (Space = Spin)
   ================================================================ */

"use strict";

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────
var students        = [];
var spinHistory     = [];
var angle           = 0;
var spinning        = false;
var lastWinnerIndex = -1;
var wheelFontSizePx = 24;

// No-repeat bag
var remainingBag = [];

// Undo
var lastRemovedStudent = null;

// Speed-based sound
var lastFrameTime      = 0;
var lastAngleForSpeed  = 0;
var currentOmega       = 0;

// NEW #4 – Statistics: maps student name → pick count
var studentStats = {};

// NEW #5 – Weights: maps student name → integer weight (1-5)
var studentWeights = {};

// ─────────────────────────────────────────────────────────────────
// ELEMENTS
// ─────────────────────────────────────────────────────────────────
var canvas        = document.getElementById("wheel");
var ctx           = canvas.getContext("2d");

var namesInput    = document.getElementById("namesInput");
var updateBtn     = document.getElementById("updateBtn");
var shuffleBtn    = document.getElementById("shuffleBtn");
var clearBtn      = document.getElementById("clearBtn");

var spinBtn            = document.getElementById("spinBtn");
var speakBtn           = document.getElementById("speakBtn");
var removeWinnerBtn    = document.getElementById("removeWinnerBtn");
var resetHistoryBtn    = document.getElementById("resetHistoryBtn");
var copyHistoryBtn     = document.getElementById("copyHistoryBtn");

var importRosterBtn    = document.getElementById("importRosterBtn");
var exportRosterBtn    = document.getElementById("exportRosterBtn");
var cleanRosterBtn     = document.getElementById("cleanRosterBtn");
var importRosterInput  = document.getElementById("importRosterInput");
var undoRemoveBtn      = document.getElementById("undoRemoveBtn");
var exportHistoryBtn   = document.getElementById("exportHistoryBtn");
var makeGroupsBtn      = document.getElementById("makeGroupsBtn");
var groupSizeInput     = document.getElementById("groupSizeInput");
var groupsOutput       = document.getElementById("groupsOutput");

var winnerNameEl     = document.getElementById("winnerName");
var winnerSubEl      = document.getElementById("winnerSub");
var historyList      = document.getElementById("historyList");
var historyCountPill = document.getElementById("historyCountPill");
var countPill        = document.getElementById("countPill");
var spinStatusPill   = document.getElementById("spinStatusPill");

var spinTimeEl    = document.getElementById("spinTime");
var spinTurnsEl   = document.getElementById("spinTurns");
var fontSizeEl    = document.getElementById("fontSize");
var fontSizeLabel = document.getElementById("fontSizeLabel");
var soundToggle   = document.getElementById("soundToggle");
var noRepeatToggle = document.getElementById("noRepeatToggle");

// NEW elements
var themeToggleBtn   = document.getElementById("themeToggleBtn");
var countdownToggle  = document.getElementById("countdownToggle");
var spotlightToggle  = document.getElementById("spotlightToggle");
var countdownOverlay = document.getElementById("countdownOverlay");
var countdownNumber  = document.getElementById("countdownNumber");
var weightedToggle   = document.getElementById("weightedToggle");
var weightsPanel     = document.getElementById("weightsPanel");
var weightsList      = document.getElementById("weightsList");
var statsPanel       = document.getElementById("statsPanel");

// Modal elements
var winnerModal    = document.getElementById("winnerModal");
var modalName      = document.getElementById("modalName");
var modalSub       = document.getElementById("modalSub");
var modalSpeakBtn  = document.getElementById("modalSpeakBtn");
var modalRemoveBtn = document.getElementById("modalRemoveBtn");
var modalCloseBtn  = document.getElementById("modalCloseBtn");

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function sanitizeLines(text) {
    var lines   = text.split(/\r?\n/);
    var cleaned = [];
    for (var i = 0; i < lines.length; i++) {
        var s = lines[i].trim();
        if (s.length > 0) cleaned.push(s);
    }
    return cleaned;
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t)   { return a + (b - a) * t; }

function shortenName(name, maxChars) {
    if (name.length <= maxChars) return name;
    return name.slice(0, Math.max(1, maxChars - 1)) + "…";
}

// ─────────────────────────────────────────────────────────────────
// BUTTON STATE
// ─────────────────────────────────────────────────────────────────
function setButtons() {
    var hasStudents = students.length > 0;
    spinBtn.disabled        = !hasStudents || spinning;
    speakBtn.disabled       = (winnerNameEl.textContent === "—") || spinning;
    removeWinnerBtn.disabled= !hasStudents || spinning || lastWinnerIndex < 0;

    updateBtn.disabled     = spinning;
    shuffleBtn.disabled    = !hasStudents || spinning;
    clearBtn.disabled      = spinning;
    resetHistoryBtn.disabled  = spinning;
    copyHistoryBtn.disabled   = spinning || spinHistory.length === 0;
    exportHistoryBtn.disabled = spinning || spinHistory.length === 0;
    exportRosterBtn.disabled  = spinning || students.length === 0;
    importRosterBtn.disabled  = spinning;
    cleanRosterBtn.disabled   = spinning;
    undoRemoveBtn.disabled    = spinning || !lastRemovedStudent;
    makeGroupsBtn.disabled    = spinning || students.length === 0;

    countPill.textContent = students.length + (students.length === 1 ? " student" : " students");

    // Status pill
    if (spinning) {
        spinStatusPill.textContent = "Spinning…";
        spinStatusPill.className   = "pill spinning";
    } else {
        spinStatusPill.textContent = "Ready";
        spinStatusPill.className   = "pill ready";
    }

    // History count
    if (historyCountPill) historyCountPill.textContent = spinHistory.length;
}

// ─────────────────────────────────────────────────────────────────
// NO-REPEAT BAG
// ─────────────────────────────────────────────────────────────────
function buildRemainingBag() {
    remainingBag = [];
    for (var i = 0; i < students.length; i++) remainingBag.push(i);
}

function pickIndexNoRepeat() {
    if (remainingBag.length === 0) buildRemainingBag();
    var k       = Math.floor(Math.random() * remainingBag.length);
    var chosen  = remainingBag[k];
    remainingBag.splice(k, 1);
    return chosen;
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #5 – WEIGHTED RANDOM PICK
// ─────────────────────────────────────────────────────────────────
/**
 * Pick a random student index using per-student weights.
 * A student with weight 3 is 3× as likely as one with weight 1.
 */
function pickIndexWeighted() {
    var totalWeight = 0;
    var weights     = [];
    for (var i = 0; i < students.length; i++) {
        var w = parseFloat(studentWeights[students[i]]) || 1;
        w = Math.max(1, Math.min(5, w));
        weights.push(w);
        totalWeight += w;
    }
    var rand = Math.random() * totalWeight;
    var cumulative = 0;
    for (var j = 0; j < weights.length; j++) {
        cumulative += weights[j];
        if (rand < cumulative) return j;
    }
    return students.length - 1;
}

// ─────────────────────────────────────────────────────────────────
// ANGLE → WINNER
// ─────────────────────────────────────────────────────────────────
function computeTargetAngleForIndex(startAngle, index, extraTurns) {
    var n = students.length;
    if (n <= 0) return startAngle;

    var slice   = (Math.PI * 2) / n;
    var pointer = (Math.PI * 3) / 2;
    var rel     = (index + 0.5) * slice;
    var desiredA = pointer - rel;

    desiredA = desiredA % (Math.PI * 2);
    if (desiredA < 0) desiredA += (Math.PI * 2);

    var startNorm = startAngle % (Math.PI * 2);
    if (startNorm < 0) startNorm += (Math.PI * 2);

    var delta = desiredA - startNorm;
    if (delta < 0) delta += (Math.PI * 2);

    return startAngle + (extraTurns * Math.PI * 2) + delta;
}

function getWinnerIndex() {
    var n = students.length;
    if (n === 0) return -1;

    var slice   = (Math.PI * 2) / n;
    var a       = angle % (Math.PI * 2);
    if (a < 0) a += (Math.PI * 2);

    var pointer = (Math.PI * 3) / 2;
    var rel     = pointer - a;
    if (rel < 0) rel += (Math.PI * 2);

    var index = Math.floor(rel / slice);
    if (index < 0) index = 0;
    if (index >= n) index = n - 1;
    return index;
}

// ─────────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────────────────────────
var STORAGE_KEY = "student_spin_wheel_v2";

function saveAppState() {
    try {
        var data = {
            students:           students,
            history:            spinHistory,
            angle:              angle,
            wheelFontSizePx:    wheelFontSizePx,
            spinTime:           Number(spinTimeEl.value),
            spinTurns:          Number(spinTurnsEl.value),
            soundOn:            !!soundToggle.checked,
            noRepeatOn:         !!noRepeatToggle.checked,
            remainingBag:       remainingBag,
            lastRemovedStudent: lastRemovedStudent,
            groupSize:          groupSizeInput ? Number(groupSizeInput.value) : 2,
            theme:              document.documentElement.getAttribute("data-theme") || "light",
            countdownOn:        !!countdownToggle.checked,
            spotlightOn:        !!spotlightToggle.checked,
            weightedOn:         !!weightedToggle.checked,
            studentStats:       studentStats,
            studentWeights:     studentWeights
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
}

function loadAppState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        var data = JSON.parse(raw);

        students    = Array.isArray(data.students)     ? data.students    : [];
        spinHistory = Array.isArray(data.history)      ? data.history     : [];
        angle       = typeof data.angle === "number"   ? data.angle       : 0;

        if (typeof data.wheelFontSizePx === "number") wheelFontSizePx = data.wheelFontSizePx;
        if (typeof data.spinTime  === "number") spinTimeEl.value  = data.spinTime;
        if (typeof data.spinTurns === "number") spinTurnsEl.value = data.spinTurns;

        soundToggle.checked    = !!data.soundOn;
        noRepeatToggle.checked = !!data.noRepeatOn;

        remainingBag        = Array.isArray(data.remainingBag) ? data.remainingBag : [];
        lastRemovedStudent  = (typeof data.lastRemovedStudent === "string") ? data.lastRemovedStudent : null;

        if (groupSizeInput && typeof data.groupSize === "number") groupSizeInput.value = data.groupSize;

        // NEW: restore new toggles & data
        if (data.theme) document.documentElement.setAttribute("data-theme", data.theme);
        updateThemeIcon();

        if (countdownToggle  && typeof data.countdownOn  === "boolean") countdownToggle.checked  = data.countdownOn;
        if (spotlightToggle  && typeof data.spotlightOn  === "boolean") spotlightToggle.checked  = data.spotlightOn;
        if (weightedToggle   && typeof data.weightedOn   === "boolean") weightedToggle.checked   = data.weightedOn;

        studentStats   = (data.studentStats   && typeof data.studentStats   === "object") ? data.studentStats   : {};
        studentWeights = (data.studentWeights && typeof data.studentWeights === "object") ? data.studentWeights : {};

        namesInput.value = students.join("\n");

        historyList.innerHTML = "";
        for (var i = 0; i < spinHistory.length; i++) {
            var li = document.createElement("li");
            li.textContent = spinHistory[i];
            historyList.appendChild(li);
        }

        renderWeightsPanel();
        renderStats();

        if (weightedToggle && weightedToggle.checked && weightsPanel) {
            weightsPanel.style.display = "";
        }

    } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────
// DRAWING
// ─────────────────────────────────────────────────────────────────
var PALETTE = [
    "#6366f1","#8b5cf6","#d946ef","#f43f5e","#f97316",
    "#eab308","#22c55e","#14b8a6","#0ea5e9","#3b82f6"
];

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width  / 2;
    var cy = canvas.height / 2;
    var r  = Math.min(cx, cy) - 10;

    // dark mode check for canvas text
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";

    // outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth   = 12;
    ctx.strokeStyle = isDark ? "rgba(129,140,248,0.25)" : "rgba(79,70,229,0.15)";
    ctx.stroke();
    ctx.restore();

    if (students.length === 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = isDark ? "rgba(241,245,249,0.85)" : "rgba(15,23,42,0.80)";
        ctx.font = "800 28px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Add names → Update Wheel", 0, -14);
        ctx.font = "600 18px Inter, system-ui, sans-serif";
        ctx.fillStyle = isDark ? "rgba(148,163,184,1)" : "rgba(100,116,139,1)";
        ctx.fillText("Then click  ▶ Spin", 0, 20);
        ctx.restore();
        return;
    }

    var n     = students.length;
    var slice = (Math.PI * 2) / n;

    for (var i = 0; i < n; i++) {
        var start = angle + i * slice;
        var end   = start + slice;
        var color = PALETTE[i % PALETTE.length];

        // Slice fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();

        // Gradient per slice for depth
        var gMid = (start + end) / 2;
        var gx1  = cx + (r * 0.3) * Math.cos(gMid);
        var gy1  = cy + (r * 0.3) * Math.sin(gMid);
        var gx2  = cx + r * Math.cos(gMid);
        var gy2  = cy + r * Math.sin(gMid);
        var grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
        grad.addColorStop(0,   hexToRgba(color, isDark ? 0.80 : 0.70));
        grad.addColorStop(1,   hexToRgba(color, isDark ? 0.55 : 0.45));
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth   = 2;
        ctx.strokeStyle = isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.12)";
        ctx.stroke();

        // Label
        var mid = (start + end) / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);

        var maxChars = (n <= 12) ? 26 : 16;
        var label    = shortenName(students[i], maxChars);

        ctx.textAlign = "right";
        ctx.font      = "800 " + wheelFontSizePx + "px Inter, system-ui, sans-serif";

        ctx.lineWidth   = Math.max(4, Math.floor(wheelFontSizePx / 5));
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.strokeText(label, r - 18, 9);

        ctx.fillStyle = isDark ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.95)";
        ctx.fillText(label, r - 18, 9);
        ctx.restore();
    }

    // center hub
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.11, 0, Math.PI * 2);
    var hubGrad = ctx.createRadialGradient(0, -4, 0, 0, 0, r * 0.11);
    hubGrad.addColorStop(0, isDark ? "#6366f1" : "#4f46e5");
    hubGrad.addColorStop(1, isDark ? "#1e1b4b" : "#312e81");
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.lineWidth   = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.restore();
}

function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

// ─────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────
function addToHistory(name) {
    spinHistory.unshift(name);
    if (spinHistory.length > 50) spinHistory.pop();

    historyList.innerHTML = "";
    for (var i = 0; i < spinHistory.length; i++) {
        var li = document.createElement("li");
        li.textContent = spinHistory[i];
        historyList.appendChild(li);
    }
}

// ─────────────────────────────────────────────────────────────────
// SPEECH
// ─────────────────────────────────────────────────────────────────
function speakName(name) {
    if (!name || name === "—") return;
    try {
        var utter   = new SpeechSynthesisUtterance(name);
        utter.rate  = 0.95;
        utter.pitch = 1.0;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    } catch (e) {}
}

function announceWinner(name) {
    winnerNameEl.textContent = name;
    winnerSubEl.textContent  = "Ask your question 🙂";

    winnerNameEl.style.transform  = "scale(1.10)";
    winnerNameEl.style.transition = "transform 130ms ease";
    setTimeout(function () { winnerNameEl.style.transform = "scale(1)"; }, 160);

    speakName(name);
    setButtons();
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #3 – WINNER SPOTLIGHT MODAL
// ─────────────────────────────────────────────────────────────────
function showWinnerModal(name) {
    if (!winnerModal) return;
    modalName.textContent = name;
    modalSub.textContent  = "Congratulations! 🎉";
    winnerModal.classList.add("active");
}

function closeWinnerModal() {
    if (!winnerModal) return;
    winnerModal.classList.remove("active");
}

if (modalCloseBtn)  modalCloseBtn.addEventListener("click", closeWinnerModal);
if (winnerModal)    winnerModal.addEventListener("click", function (e) {
    if (e.target === winnerModal) closeWinnerModal();
});

if (modalSpeakBtn) modalSpeakBtn.addEventListener("click", function () {
    speakName(modalName.textContent);
});

if (modalRemoveBtn) modalRemoveBtn.addEventListener("click", function () {
    closeWinnerModal();
    removeWinner();
});

// ─────────────────────────────────────────────────────────────────
// AUDIO
// ─────────────────────────────────────────────────────────────────
var audioCtx  = null;
var tickGain  = null;
var tickOsc   = null;
var tickTimer = null;
var audioReady = false;

function ensureAudio() {
    if (audioReady) return;
    try {
        audioCtx       = new (window.AudioContext || window.webkitAudioContext)();
        tickGain       = audioCtx.createGain();
        tickGain.gain.value = 0.0;
        tickGain.connect(audioCtx.destination);
        tickOsc        = audioCtx.createOscillator();
        tickOsc.type   = "triangle";
        tickOsc.frequency.value = 220;
        tickOsc.connect(tickGain);
        tickOsc.start();
        audioReady = true;
    } catch (e) { audioReady = false; }
}

function startSpinSound() {
    if (!soundToggle.checked) return;
    ensureAudio();
    if (!audioReady) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(function () {});

    stopSpinSound();
    tickTimer = setInterval(function () {
        if (!spinning) return;
        var omegaAbs    = Math.abs(currentOmega);
        var t           = clamp(omegaAbs / 25, 0, 1);
        var ticksPerSec = lerp(3, 20, t);
        var p           = clamp(ticksPerSec * 0.02, 0, 1);
        if (Math.random() > p) return;

        var freq = lerp(180, 850, t);
        tickOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        var now = audioCtx.currentTime;
        tickGain.gain.cancelScheduledValues(now);
        tickGain.gain.setValueAtTime(0.0001, now);
        tickGain.gain.linearRampToValueAtTime(0.20, now + 0.004);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    }, 20);
}

function stopSpinSound() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (audioReady && tickGain && audioCtx) {
        var now = audioCtx.currentTime;
        tickGain.gain.cancelScheduledValues(now);
        tickGain.gain.setValueAtTime(0.0001, now);
    }
}

// ─────────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────────
function updateWheelFromText() {
    students        = sanitizeLines(namesInput.value);
    lastWinnerIndex = -1;

    buildRemainingBag();

    winnerNameEl.textContent = "—";
    winnerSubEl.textContent  = students.length
        ? "Ready to spin."
        : "Add names → Update Wheel → Spin.";

    renderWeightsPanel();
    renderStats();
    drawWheel();
    setButtons();
    if (groupsOutput) groupsOutput.textContent = "";
    saveAppState();
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #2 – COUNTDOWN TIMER (3 – 2 – 1)
// ─────────────────────────────────────────────────────────────────
/**
 * Shows a 3-2-1 countdown overlay on the wheel canvas, then
 * calls the callback when done.
 */
function runCountdown(callback) {
    if (!countdownToggle || !countdownToggle.checked) {
        callback();
        return;
    }

    var count = 3;
    countdownOverlay.style.display = "flex";
    countdownNumber.textContent    = count;

    // force reflow to restart animation
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = "none";
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = "";

    var interval = setInterval(function () {
        count--;
        if (count <= 0) {
            clearInterval(interval);
            countdownOverlay.style.display = "none";
            callback();
            return;
        }
        countdownNumber.textContent = count;
        // restart CSS animation
        countdownNumber.style.animation = "none";
        void countdownNumber.offsetWidth;
        countdownNumber.style.animation = "";
    }, 900);
}

// ─────────────────────────────────────────────────────────────────
// SPIN
// ─────────────────────────────────────────────────────────────────
function spin() {
    if (students.length === 0) return;
    if (spinning) return;

    // Countdown first, then actually spin
    runCountdown(doSpin);
}

function doSpin() {
    startSpinSound();
    spinning = true;
    setButtons();

    var seconds    = Number(spinTimeEl.value);
    var turns      = Number(spinTurnsEl.value);
    var startAngle = angle;

    // Pick winner index
    var chosenIndex;
    if (weightedToggle && weightedToggle.checked) {
        chosenIndex = pickIndexWeighted();          // NEW #5
    } else if (noRepeatToggle.checked) {
        chosenIndex = pickIndexNoRepeat();
    } else {
        chosenIndex = Math.floor(Math.random() * students.length);
    }

    var targetAngle = computeTargetAngleForIndex(startAngle, chosenIndex, turns);
    var startTime   = performance.now();
    var duration    = seconds * 1000;

    lastFrameTime     = startTime;
    lastAngleForSpeed = angle;
    currentOmega      = 0;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function finishSafely() {
        spinning = false;
        stopSpinSound();
        setButtons();
    }

    function step(now) {
        try {
            var elapsed = now - startTime;
            var t       = elapsed / duration;
            if (t > 1) t = 1;

            var eased = easeOutCubic(t);
            angle = startAngle + (targetAngle - startAngle) * eased;

            var dt = (now - lastFrameTime) / 1000;
            if (dt > 0) {
                var dA = angle - lastAngleForSpeed;
                currentOmega = dA / dt;
            }
            lastFrameTime     = now;
            lastAngleForSpeed = angle;

            drawWheel();

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                lastWinnerIndex = getWinnerIndex();
                var winner      = students[lastWinnerIndex];

                // Update stats (NEW #4)
                recordStat(winner);

                announceWinner(winner);
                addToHistory(winner);

                // Spotlight modal (NEW #3)
                if (spotlightToggle && spotlightToggle.checked) {
                    showWinnerModal(winner);
                }

                renderStats();
                saveAppState();
                finishSafely();
            }
        } catch (err) {
            console.error(err);
            finishSafely();
        }
    }

    requestAnimationFrame(step);
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #4 – STATISTICS
// ─────────────────────────────────────────────────────────────────
/**
 * Increment the pick count for a student name.
 */
function recordStat(name) {
    if (!name) return;
    studentStats[name] = (studentStats[name] || 0) + 1;
}

/**
 * Render statistics as a sorted bar list.
 */
function renderStats() {
    if (!statsPanel) return;

    // Gather only current roster names
    var names = students.slice();
    if (names.length === 0) {
        statsPanel.innerHTML = "<span>No spins yet.</span>";
        return;
    }

    // Find max count for bar scaling
    var maxCount = 0;
    for (var i = 0; i < names.length; i++) {
        var c = studentStats[names[i]] || 0;
        if (c > maxCount) maxCount = c;
    }

    // Sort by count descending
    names.sort(function (a, b) {
        return (studentStats[b] || 0) - (studentStats[a] || 0);
    });

    var html = "";
    for (var j = 0; j < names.length; j++) {
        var n   = names[j];
        var cnt = studentStats[n] || 0;
        var pct = maxCount > 0 ? Math.round((cnt / maxCount) * 100) : 0;
        html += '<div class="stats-row">' +
                  '<span class="stats-name" title="' + n + '">' + escHtml(n) + '</span>' +
                  '<div class="stats-bar-wrap"><div class="stats-bar" style="width:' + pct + '%"></div></div>' +
                  '<span class="stats-count">' + cnt + '</span>' +
                '</div>';
    }

    statsPanel.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #5 – WEIGHTS PANEL
// ─────────────────────────────────────────────────────────────────
/**
 * Render a row per student with a number input (1–5) for weight.
 */
function renderWeightsPanel() {
    if (!weightsList) return;
    if (students.length === 0) {
        weightsList.innerHTML = "<span class='mini'>No students yet.</span>";
        return;
    }

    var html = "";
    for (var i = 0; i < students.length; i++) {
        var name = students[i];
        var w    = studentWeights[name] !== undefined ? studentWeights[name] : 1;
        html += '<div class="weight-row">' +
                  '<span class="weight-name" title="' + escHtml(name) + '">' + escHtml(name) + '</span>' +
                  '<input class="weight-input" type="number" min="1" max="5" step="1" ' +
                         'data-name="' + escAttr(name) + '" value="' + w + '" ' +
                         'aria-label="Weight for ' + escAttr(name) + '" />' +
                '</div>';
    }
    weightsList.innerHTML = html;

    // Wire up change events
    var inputs = weightsList.querySelectorAll("input[data-name]");
    for (var j = 0; j < inputs.length; j++) {
        inputs[j].addEventListener("change", function () {
            var n = this.getAttribute("data-name");
            var v = Math.max(1, Math.min(5, parseInt(this.value, 10) || 1));
            this.value        = v;
            studentWeights[n] = v;
            saveAppState();
        });
    }
}

function escHtml(s) {
    return String(s)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;");
}

function escAttr(s) {
    return String(s).replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────
// REMOVE WINNER / UNDO / RESET
// ─────────────────────────────────────────────────────────────────
function removeWinner() {
    if (lastWinnerIndex < 0 || lastWinnerIndex >= students.length) return;

    var removed        = students.splice(lastWinnerIndex, 1)[0];
    lastRemovedStudent = removed || null;
    lastWinnerIndex    = -1;

    buildRemainingBag();

    namesInput.value         = students.join("\n");
    winnerNameEl.textContent = "—";
    winnerSubEl.textContent  = removed ? ("Removed: " + removed + ". Spin again.") : "Spin again.";

    renderWeightsPanel();
    renderStats();
    drawWheel();
    setButtons();
    saveAppState();
}

function resetHistory() {
    spinHistory           = [];
    historyList.innerHTML = "";
    winnerSubEl.textContent = students.length ? "Ready to spin." : "Add names → Update Wheel → Spin.";
    saveAppState();
    setButtons();
}

function copyHistory() {
    var text = spinHistory.join("\n");
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
    } else {
        window.prompt("Copy history:", text);
    }
}

function exportRoster() {
    var text = students.join("\n");
    if (!text) { alert("Roster is empty."); return; }
    downloadText(text + "\n", "roster.txt");
}

function importRosterFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
        var content = String(reader.result || "");
        var names   = content.split(/[\n,]/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
        namesInput.value = names.join("\n");
        updateWheelFromText();
    };
    reader.readAsText(file);
}

function cleanRoster() {
    var lines   = sanitizeLines(namesInput.value);
    var seen    = {};
    var cleaned = [];
    for (var i = 0; i < lines.length; i++) {
        var key = lines[i].toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        cleaned.push(lines[i]);
    }
    namesInput.value = cleaned.join("\n");
    updateWheelFromText();
}

function exportHistory() {
    if (!spinHistory.length) { alert("History is empty."); return; }
    downloadText(spinHistory.join("\n") + "\n", "spin-history.txt");
}

function undoRemove() {
    if (spinning) return;
    if (!lastRemovedStudent) { alert("Nothing to undo."); return; }

    students.push(lastRemovedStudent);
    namesInput.value   = students.join("\n");
    lastRemovedStudent = null;

    buildRemainingBag();
    winnerSubEl.textContent = "Undo complete. Ready to spin.";
    renderWeightsPanel();
    renderStats();
    drawWheel();
    setButtons();
    saveAppState();
}

function makeGroups() {
    if (spinning) return;
    if (!groupSizeInput || !groupsOutput) return;

    var size = Number(groupSizeInput.value);
    if (!Number.isFinite(size) || size < 2) { alert("Group size must be 2 or more."); return; }

    var names = sanitizeLines(namesInput.value);
    if (names.length < 2) { alert("Not enough names to create groups."); return; }

    var shuffled = names.slice();
    shuffleArray(shuffled);

    var out = [];
    var g   = 1;
    for (var i = 0; i < shuffled.length; i += size) {
        out.push("Group " + g + ": " + shuffled.slice(i, i + size).join(", "));
        g++;
    }
    groupsOutput.textContent = out.join("\n");
    saveAppState();
}

// Generic file download
function downloadText(text, filename) {
    var blob = new Blob([text], { type: "text/plain" });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement("a");
    a.href   = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #1 – DARK / LIGHT THEME TOGGLE
// ─────────────────────────────────────────────────────────────────
/**
 * Toggles between light and dark themes by setting the
 * data-theme attribute on the <html> element.
 */
function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "light";
    var next    = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    updateThemeIcon();
    drawWheel(); // redraw with theme-aware colours
    saveAppState();
}

function updateThemeIcon() {
    if (!themeToggleBtn) return;
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
    themeToggleBtn.title       = isDark ? "Switch to light mode" : "Switch to dark mode";
}

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE #6 – KEYBOARD SHORTCUT  (Space = Spin)
// ─────────────────────────────────────────────────────────────────
/**
 * Listen for the Space key globally.  Ignores spacebar events
 * when the user is typing inside an input / textarea.
 */
document.addEventListener("keydown", function (e) {
    if (e.code !== "Space" && e.key !== " ") return;

    var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    e.preventDefault();      // prevent page scroll
    if (!spinning && !spinBtn.disabled) spin();
});

// ─────────────────────────────────────────────────────────────────
// WIRE-UP EVENTS
// ─────────────────────────────────────────────────────────────────
updateBtn.addEventListener("click", updateWheelFromText);

shuffleBtn.addEventListener("click", function () {
    if (spinning || students.length === 0) return;
    shuffleArray(students);
    namesInput.value = students.join("\n");
    buildRemainingBag();
    renderWeightsPanel();
    drawWheel();
    setButtons();
    saveAppState();
});

clearBtn.addEventListener("click", function () {
    if (spinning) return;
    namesInput.value   = "";
    students           = [];
    lastWinnerIndex    = -1;
    remainingBag       = [];
    lastRemovedStudent = null;
    spinHistory        = [];
    studentStats       = {};
    if (groupsOutput) groupsOutput.textContent = "";
    historyList.innerHTML    = "";
    winnerNameEl.textContent = "—";
    winnerSubEl.textContent  = "Add names → Update Wheel → Spin.";
    renderWeightsPanel();
    renderStats();
    drawWheel();
    setButtons();
    saveAppState();
});

spinBtn.addEventListener("click", spin);

speakBtn.addEventListener("click", function () {
    speakName(winnerNameEl.textContent);
});

removeWinnerBtn.addEventListener("click", removeWinner);
resetHistoryBtn.addEventListener("click", resetHistory);
copyHistoryBtn.addEventListener("click", copyHistory);

if (exportRosterBtn)  exportRosterBtn.addEventListener("click", exportRoster);
if (cleanRosterBtn)   cleanRosterBtn.addEventListener("click", function () { if (!spinning) cleanRoster(); });
if (undoRemoveBtn)    undoRemoveBtn.addEventListener("click", undoRemove);
if (exportHistoryBtn) exportHistoryBtn.addEventListener("click", exportHistory);
if (makeGroupsBtn)    makeGroupsBtn.addEventListener("click", makeGroups);

if (importRosterBtn && importRosterInput) {
    importRosterBtn.addEventListener("click", function () {
        importRosterInput.value = "";
        importRosterInput.click();
    });
    importRosterInput.addEventListener("change", function (e) {
        var file = e.target.files && e.target.files[0];
        importRosterFile(file);
    });
}

// NEW feature wiring
if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

if (weightedToggle) weightedToggle.addEventListener("change", function () {
    if (weightsPanel) {
        weightsPanel.style.display = weightedToggle.checked ? "" : "none";
    }
    saveAppState();
});

fontSizeEl.addEventListener("input", function () {
    wheelFontSizePx = Number(fontSizeEl.value);
    fontSizeLabel.textContent = wheelFontSizePx + " px";
    drawWheel();
    saveAppState();
});

soundToggle.addEventListener("change", function () {
    if (!soundToggle.checked) stopSpinSound();
    saveAppState();
});

noRepeatToggle.addEventListener("change", function () {
    if (noRepeatToggle.checked) buildRemainingBag();
    saveAppState();
});

if (countdownToggle) countdownToggle.addEventListener("change", saveAppState);
if (spotlightToggle) spotlightToggle.addEventListener("change", saveAppState);

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
loadAppState();

fontSizeEl.value          = wheelFontSizePx;
fontSizeLabel.textContent = wheelFontSizePx + " px";

if (students.length > 0 && remainingBag.length === 0) buildRemainingBag();

updateThemeIcon();
renderStats();
renderWeightsPanel();
drawWheel();
setButtons();
