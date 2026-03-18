// ---------------- State ----------------
var students = [];
var spinHistory = []; // FIX: don't use "history" (conflicts with window.history)
var angle = 0;
var spinning = false;
var lastWinnerIndex = -1;

// Wheel label font size (controlled by panel)
var wheelFontSizePx = 24;

// For speed-based sound
var lastFrameTime = 0;
var lastAngleForSpeed = 0;
var currentOmega = 0; // rad/sec (angular velocity)

// NEW: No-repeat cycle bag
var remainingBag = [];

// NEW: Undo remove
var lastRemovedStudent = null;

// ---------------- Elements ----------------
var canvas = document.getElementById("wheel");
var ctx = canvas.getContext("2d");

var namesInput = document.getElementById("namesInput");
var updateBtn = document.getElementById("updateBtn");
var shuffleBtn = document.getElementById("shuffleBtn");
var clearBtn = document.getElementById("clearBtn");

var spinBtn = document.getElementById("spinBtn");
var speakBtn = document.getElementById("speakBtn");
var removeWinnerBtn = document.getElementById("removeWinnerBtn");
var resetHistoryBtn = document.getElementById("resetHistoryBtn");
var copyHistoryBtn = document.getElementById("copyHistoryBtn");

// NEW: Extra buttons / inputs
var importRosterBtn = document.getElementById("importRosterBtn");
var exportRosterBtn = document.getElementById("exportRosterBtn");
var cleanRosterBtn = document.getElementById("cleanRosterBtn");
var importRosterInput = document.getElementById("importRosterInput");
var undoRemoveBtn = document.getElementById("undoRemoveBtn");
var exportHistoryBtn = document.getElementById("exportHistoryBtn");
var makeGroupsBtn = document.getElementById("makeGroupsBtn");
var groupSizeInput = document.getElementById("groupSizeInput");
var groupsOutput = document.getElementById("groupsOutput");

var winnerNameEl = document.getElementById("winnerName");
var winnerSubEl = document.getElementById("winnerSub");
var historyList = document.getElementById("historyList");
var countPill = document.getElementById("countPill");

var spinTimeEl = document.getElementById("spinTime");
var spinTurnsEl = document.getElementById("spinTurns");

var fontSizeEl = document.getElementById("fontSize");
var fontSizeLabel = document.getElementById("fontSizeLabel");
var soundToggle = document.getElementById("soundToggle");
var noRepeatToggle = document.getElementById("noRepeatToggle");

// ---------------- Helpers ----------------
function sanitizeLines(text) {
    var lines = text.split(/\r?\n/);
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

function setButtons() {
    var hasStudents = students.length > 0;
    spinBtn.disabled = !hasStudents || spinning;
    speakBtn.disabled = (winnerNameEl.textContent === "—") || spinning;
    removeWinnerBtn.disabled = !hasStudents || spinning || lastWinnerIndex < 0;

    updateBtn.disabled = spinning;
    shuffleBtn.disabled = !hasStudents || spinning;
    clearBtn.disabled = spinning;
    resetHistoryBtn.disabled = spinning;
    copyHistoryBtn.disabled = spinning || spinHistory.length === 0;

    // NEW: extra controls
    if (exportHistoryBtn) exportHistoryBtn.disabled = spinning || spinHistory.length === 0;
    if (exportRosterBtn) exportRosterBtn.disabled = spinning || students.length === 0;
    if (importRosterBtn) importRosterBtn.disabled = spinning;
    if (cleanRosterBtn) cleanRosterBtn.disabled = spinning;
    if (undoRemoveBtn) undoRemoveBtn.disabled = spinning || !lastRemovedStudent;
    if (makeGroupsBtn) makeGroupsBtn.disabled = spinning || students.length === 0;

    countPill.textContent = students.length + (students.length === 1 ? " student" : " students");
}

function shortenName(name, maxChars) {
    if (name.length <= maxChars) return name;
    return name.slice(0, Math.max(1, maxChars - 1)) + "…";
}

// NEW: No-repeat helpers
function buildRemainingBag() {
    remainingBag = [];
    for (var i = 0; i < students.length; i++) remainingBag.push(i);
}

function pickIndexNoRepeat() {
    if (remainingBag.length === 0) buildRemainingBag();
    var k = Math.floor(Math.random() * remainingBag.length);
    var chosen = remainingBag[k];
    remainingBag.splice(k, 1);
    return chosen;
}

function computeTargetAngleForIndex(startAngle, index, extraTurns) {
    var n = students.length;
    if (n <= 0) return startAngle;

    var slice = (Math.PI * 2) / n;
    var pointer = (Math.PI * 3) / 2; // top pointer

    // land pointer at center of chosen slice
    var rel = (index + 0.5) * slice;
    var desiredA = pointer - rel;

    desiredA = desiredA % (Math.PI * 2);
    if (desiredA < 0) desiredA += (Math.PI * 2);

    var startNorm = startAngle % (Math.PI * 2);
    if (startNorm < 0) startNorm += (Math.PI * 2);

    var delta = desiredA - startNorm;
    if (delta < 0) delta += (Math.PI * 2);

    return startAngle + (extraTurns * Math.PI * 2) + delta;
}

// ---------------- Local Storage ----------------
var STORAGE_KEY = "student_spin_wheel_v1";

function saveAppState() {
    try {
        var data = {
            students: students,
            history: spinHistory, // keep key name "history" for backward compatibility
            angle: angle,
            wheelFontSizePx: wheelFontSizePx,
            spinTime: Number(spinTimeEl.value),
            spinTurns: Number(spinTurnsEl.value),
            soundOn: !!soundToggle.checked,
            noRepeatOn: !!noRepeatToggle.checked,
            remainingBag: remainingBag,
            lastRemovedStudent: lastRemovedStudent,
            groupSize: groupSizeInput ? Number(groupSizeInput.value) : 2
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { }
}

function loadAppState() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        var data = JSON.parse(raw);

        students = Array.isArray(data.students) ? data.students : [];
        spinHistory = Array.isArray(data.history) ? data.history : []; // FIX
        angle = typeof data.angle === "number" ? data.angle : 0;

        if (typeof data.wheelFontSizePx === "number") wheelFontSizePx = data.wheelFontSizePx;
        if (typeof data.spinTime === "number") spinTimeEl.value = data.spinTime;
        if (typeof data.spinTurns === "number") spinTurnsEl.value = data.spinTurns;

        soundToggle.checked = !!data.soundOn;
        noRepeatToggle.checked = !!data.noRepeatOn;

        remainingBag = Array.isArray(data.remainingBag) ? data.remainingBag : [];
        lastRemovedStudent = (typeof data.lastRemovedStudent === "string") ? data.lastRemovedStudent : null;
        if (groupSizeInput && typeof data.groupSize === "number") groupSizeInput.value = data.groupSize;

        namesInput.value = students.join("\n");

        historyList.innerHTML = "";
        for (var i = 0; i < spinHistory.length; i++) {
            var li = document.createElement("li");
            li.textContent = spinHistory[i];
            historyList.appendChild(li);
        }
    } catch (e) { }
}

// ---------------- Drawing ----------------
function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var r = Math.min(cx, cy) - 10;

    // outer ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.02)";
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.stroke();
    ctx.restore();

    if (students.length === 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "rgba(17,24,39,0.85)";
        ctx.font = "800 30px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Add student names → Update Wheel", 0, -10);
        ctx.font = "600 18px system-ui, sans-serif";
        ctx.fillStyle = "rgba(107,114,128,1)";
        ctx.fillText("Then click Spin", 0, 22);
        ctx.restore();
        return;
    }

    var n = students.length;
    var slice = (Math.PI * 2) / n;

    for (var i = 0; i < n; i++) {
        var start = angle + i * slice;
        var end = start + slice;

        var hue = Math.round((i * 360) / n);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = "hsla(" + hue + ", 80%, 60%, 0.55)";
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.10)";
        ctx.stroke();

        var mid = (start + end) / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(mid);

        var maxChars = (n <= 12) ? 26 : 16;
        var label = shortenName(students[i], maxChars);

        ctx.textAlign = "right";
        ctx.font = "900 " + wheelFontSizePx + "px system-ui, sans-serif";

        ctx.lineWidth = Math.max(4, Math.floor(wheelFontSizePx / 5));
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.strokeText(label, r - 18, 10);

        ctx.fillStyle = "rgba(17,24,39,0.95)";
        ctx.fillText(label, r - 18, 10);

        ctx.restore();
    }

    // center hub
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.restore();
}

function getWinnerIndex() {
    var n = students.length;
    if (n === 0) return -1;

    var slice = (Math.PI * 2) / n;

    var a = angle % (Math.PI * 2);
    if (a < 0) a += (Math.PI * 2);

    var pointer = (Math.PI * 3) / 2; // top pointer
    var rel = pointer - a;
    if (rel < 0) rel += (Math.PI * 2);

    var index = Math.floor(rel / slice);
    if (index < 0) index = 0;
    if (index >= n) index = n - 1;
    return index;
}

// ---------------- History ----------------
function addToHistory(name) {
    spinHistory.unshift(name);
    if (spinHistory.length > 30) spinHistory.pop();

    historyList.innerHTML = "";
    for (var i = 0; i < spinHistory.length; i++) {
        var li = document.createElement("li");
        li.textContent = spinHistory[i];
        historyList.appendChild(li);
    }
}

// ---------------- Speech ----------------
function speakName(name) {
    if (!name || name === "—") return;
    try {
        var utter = new SpeechSynthesisUtterance(name);
        utter.rate = 0.95;
        utter.pitch = 1.0;
        speechSynthesis.cancel();
        speechSynthesis.speak(utter);
    } catch (e) { }
}

function announceWinner(name) {
    winnerNameEl.textContent = name;
    winnerSubEl.textContent = "Ask your question 🙂";

    winnerNameEl.style.transform = "scale(1.08)";
    winnerNameEl.style.transition = "transform 120ms ease";
    setTimeout(function () { winnerNameEl.style.transform = "scale(1)"; }, 140);

    speakName(name);
    setButtons();
}

// ---------------- Speed-based Sound ----------------
var audioCtx = null;
var tickGain = null;
var tickOsc = null;
var tickTimer = null;
var audioReady = false;

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function ensureAudio() {
    if (audioReady) return;

    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        tickGain = audioCtx.createGain();
        tickGain.gain.value = 0.0;
        tickGain.connect(audioCtx.destination);

        tickOsc = audioCtx.createOscillator();
        tickOsc.type = "triangle";
        tickOsc.frequency.value = 220;
        tickOsc.connect(tickGain);
        tickOsc.start();

        audioReady = true;
    } catch (e) {
        audioReady = false;
    }
}

function startSpinSound() {
    if (!soundToggle.checked) return;

    ensureAudio();
    if (!audioReady) return;

    if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(function () { });
    }

    stopSpinSound();

    tickTimer = setInterval(function () {
        if (!spinning) return;

        var omegaAbs = Math.abs(currentOmega);
        var t = clamp(omegaAbs / 25, 0, 1);

        var ticksPerSec = lerp(3, 20, t);
        var p = clamp(ticksPerSec * 0.02, 0, 1);
        if (Math.random() > p) return;

        var freq = lerp(180, 850, t);
        tickOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        var now = audioCtx.currentTime;
        tickGain.gain.cancelScheduledValues(now);
        tickGain.gain.setValueAtTime(0.0001, now);
        tickGain.gain.linearRampToValueAtTime(0.18, now + 0.004);
        tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    }, 20);
}

function stopSpinSound() {
    if (tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
    }

    if (audioReady && tickGain && audioCtx) {
        var now = audioCtx.currentTime;
        tickGain.gain.cancelScheduledValues(now);
        tickGain.gain.setValueAtTime(0.0001, now);
    }
}

// ---------------- Actions ----------------
function updateWheelFromText() {
    students = sanitizeLines(namesInput.value);
    lastWinnerIndex = -1;

    buildRemainingBag();

    winnerNameEl.textContent = "—";
    winnerSubEl.textContent = students.length ? "Ready to spin." : "Add names → Update Wheel → Spin.";

    drawWheel();
    setButtons();
    if (groupsOutput) groupsOutput.textContent = "";
    saveAppState();
}

function spin() {
    if (students.length === 0) return;
    if (spinning) return;

    startSpinSound();

    spinning = true;
    setButtons();

    var seconds = Number(spinTimeEl.value);
    var turns = Number(spinTurnsEl.value);

    var startAngle = angle;

    var chosenIndex;
    if (noRepeatToggle.checked) {
        chosenIndex = pickIndexNoRepeat();
    } else {
        chosenIndex = Math.floor(Math.random() * students.length);
    }

    var targetAngle = computeTargetAngleForIndex(startAngle, chosenIndex, turns);

    var startTime = performance.now();
    var duration = seconds * 1000;

    lastFrameTime = startTime;
    lastAngleForSpeed = angle;
    currentOmega = 0;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function finishSafely() {
        spinning = false;
        stopSpinSound();
        setButtons();
    }

    function step(now) {
        try {
            var elapsed = now - startTime;
            var t = elapsed / duration;
            if (t > 1) t = 1;

            var eased = easeOutCubic(t);
            angle = startAngle + (targetAngle - startAngle) * eased;

            var dt = (now - lastFrameTime) / 1000;
            if (dt > 0) {
                var dA = angle - lastAngleForSpeed;
                currentOmega = dA / dt;
            }
            lastFrameTime = now;
            lastAngleForSpeed = angle;

            drawWheel();

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                lastWinnerIndex = getWinnerIndex();
                var winner = students[lastWinnerIndex];

                announceWinner(winner);
                addToHistory(winner);

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

function removeWinner() {
    if (lastWinnerIndex < 0 || lastWinnerIndex >= students.length) return;

    var removed = students.splice(lastWinnerIndex, 1)[0];
    lastRemovedStudent = removed || null;
    lastWinnerIndex = -1;

    buildRemainingBag();

    namesInput.value = students.join("\n");
    winnerNameEl.textContent = "—";
    winnerSubEl.textContent = removed ? ("Removed: " + removed + ". Spin again.") : "Spin again.";

    drawWheel();
    setButtons();
    saveAppState();
}

function resetHistory() {
    spinHistory = [];
    historyList.innerHTML = "";
    winnerSubEl.textContent = students.length ? "Ready to spin." : "Add names → Update Wheel → Spin.";
    saveAppState();
}

// Copy History
function copyHistory() {
    var text = spinHistory.join("\n");
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { });
    } else {
        window.prompt("Copy history:", text);
    }
}

/* =========================
   NEW FUNCTIONS (Task A)
   ========================= */

// Export roster
function exportRoster() {
    var text = students.join("\n");
    if (!text) { alert("Roster is empty."); return; }
    var blob = new Blob([text + "\n"], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "roster.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Import roster (.txt/.csv)
function importRosterFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
        var content = String(reader.result || "");
        var names = content.split(/[\n,]/)
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });

        namesInput.value = names.join("\n");
        updateWheelFromText();
    };
    reader.readAsText(file);
}

// Clean roster (remove duplicates)
function cleanRoster() {
    var lines = sanitizeLines(namesInput.value);
    var seen = {};
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

// Export history
function exportHistory() {
    if (!spinHistory.length) { alert("History is empty."); return; }
    var text = spinHistory.join("\n");
    var blob = new Blob([text + "\n"], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "history.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Undo last remove
function undoRemove() {
    if (spinning) return;
    if (!lastRemovedStudent) { alert("Nothing to undo."); return; }

    students.push(lastRemovedStudent);
    namesInput.value = students.join("\n");
    lastRemovedStudent = null;

    buildRemainingBag();
    winnerSubEl.textContent = "Undo complete. Ready to spin.";
    drawWheel();
    setButtons();
    saveAppState();
}

// Random group generator
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
    var g = 1;
    for (var i = 0; i < shuffled.length; i += size) {
        out.push("Group " + g + ": " + shuffled.slice(i, i + size).join(", "));
        g++;
    }
    groupsOutput.textContent = out.join("\n");
    saveAppState();
}

// ---------------- Wire up ----------------
updateBtn.addEventListener("click", updateWheelFromText);

shuffleBtn.addEventListener("click", function () {
    if (spinning || students.length === 0) return;
    shuffleArray(students);
    namesInput.value = students.join("\n");
    buildRemainingBag();
    drawWheel();
    setButtons();
    saveAppState();
});

clearBtn.addEventListener("click", function () {
    if (spinning) return;

    namesInput.value = "";
    students = [];
    lastWinnerIndex = -1;

    remainingBag = [];
    lastRemovedStudent = null;
    if (groupsOutput) groupsOutput.textContent = "";

    spinHistory = [];
    historyList.innerHTML = "";

    winnerNameEl.textContent = "—";
    winnerSubEl.textContent = "Add names → Update Wheel → Spin.";

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

// NEW: Wire up extra features
if (exportRosterBtn) exportRosterBtn.addEventListener("click", exportRoster);
if (cleanRosterBtn) cleanRosterBtn.addEventListener("click", function () { if (!spinning) cleanRoster(); });

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
if (undoRemoveBtn) undoRemoveBtn.addEventListener("click", undoRemove);
if (exportHistoryBtn) exportHistoryBtn.addEventListener("click", exportHistory);
if (makeGroupsBtn) makeGroupsBtn.addEventListener("click", makeGroups);

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

// ---------------- Init ----------------
loadAppState();

fontSizeEl.value = wheelFontSizePx;
fontSizeLabel.textContent = wheelFontSizePx + " px";

if (students.length > 0 && remainingBag.length === 0) buildRemainingBag();

drawWheel();
setButtons();
