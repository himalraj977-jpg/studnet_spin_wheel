let names = [];
let history = [];
let lastWinner = "";
let removedStack = [];

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

function drawWheel() {
    const angle = (2 * Math.PI) / names.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    names.forEach((name, i) => {
        ctx.beginPath();
        ctx.moveTo(300, 300);
        ctx.arc(300, 300, 300, i * angle, (i + 1) * angle);
        ctx.fillStyle = i % 2 === 0 ? "#f39c12" : "#3498db";
        ctx.fill();

        ctx.save();
        ctx.translate(300, 300);
        ctx.rotate(i * angle + angle / 2);
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText(name, 150, 0);
        ctx.restore();
    });
}

function addName() {
    const input = document.getElementById("nameInput");
    if (input.value.trim() !== "") {
        names.push(input.value.trim());
        input.value = "";
        drawWheel();
    }
}

function spin() {
    if (names.length === 0) return;

    const randomIndex = Math.floor(Math.random() * names.length);
    const winner = names[randomIndex];

    lastWinner = winner;
    history.push(winner);

    document.getElementById("winner").innerText = winner;
    updateHistoryDisplay();
}

function reset() {
    names = [];
    drawWheel();
}

function updateHistoryDisplay() {
    const list = document.getElementById("history");
    list.innerHTML = "";
    history.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
    });
}

/* ===== NEW FUNCTIONS ===== */

function exportRoster() {
    const data = names.join("\n");
    const blob = new Blob([data], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roster.txt";
    a.click();
}

function importRoster(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        names = e.target.result.split("\n").filter(n => n.trim() !== "");
        drawWheel();
    };

    reader.readAsText(file);
}

function removeWinner() {
    if (lastWinner !== "") {
        removedStack.push(lastWinner);
        names = names.filter(n => n !== lastWinner);
        lastWinner = "";
        drawWheel();
    }
}

function undoRemove() {
    if (removedStack.length > 0) {
        names.push(removedStack.pop());
        drawWheel();
    }
}

function copyHistory() {
    navigator.clipboard.writeText(history.join("\n"));
    alert("History copied!");
}

function resetHistory() {
    history = [];
    updateHistoryDisplay();
}

function cleanRoster() {
    names = [...new Set(names.map(n => n.trim()))];
    drawWheel();
}
