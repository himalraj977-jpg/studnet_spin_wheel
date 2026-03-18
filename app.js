let names = [];
let history = [];
let removedStack = [];
let currentAngle = 0;
let lastWinner = "";

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

function updateWheel() {
    const text = document.getElementById("roster").value;
    names = text.split("\n").filter(n => n.trim() !== "");
    drawWheel();
}

function drawWheel() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 300;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (names.length === 0) return;

    const angle = (2 * Math.PI) / names.length;

    names.forEach((name, i) => {
        let start = currentAngle + i * angle;
        let end = start + angle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.fillStyle = i % 2 === 0 ? "#ff7675" : "#74b9ff";
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + angle / 2);
        ctx.fillStyle = "white";
        ctx.font = "18px Arial";
        ctx.fillText(name, 140, 0);
        ctx.restore();
    });
}

function spin() {
    if (names.length === 0) return;

    let duration = document.getElementById("spinTime").value * 1000;
    let turns = document.getElementById("extraTurns").value;

    let start = null;
    let totalRotation = turns * 2 * Math.PI + Math.random() * 2 * Math.PI;

    function animate(time) {
        if (!start) start = time;
        let progress = time - start;

        let ease = progress / duration;
        currentAngle = totalRotation * ease;

        drawWheel();

        if (progress < duration) {
            requestAnimationFrame(animate);
        } else {
            pickWinner();
        }
    }

    requestAnimationFrame(animate);
}

function pickWinner() {
    const slice = (2 * Math.PI) / names.length;
    const index = Math.floor((2 * Math.PI - currentAngle % (2 * Math.PI)) / slice) % names.length;

    let winner = names[index];
    lastWinner = winner;

    document.getElementById("winner").innerText = winner;

    history.push(winner);
    updateHistory();
}

function updateHistory() {
    let ul = document.getElementById("history");
    ul.innerHTML = "";

    history.forEach(h => {
        let li = document.createElement("li");
        li.textContent = h;
        ul.appendChild(li);
    });
}

function removeWinner() {
    if (!lastWinner) return;

    removedStack.push(lastWinner);
    names = names.filter(n => n !== lastWinner);

    updateTextArea();
    drawWheel();
}

function undoRemove() {
    if (removedStack.length === 0) return;

    names.push(removedStack.pop());
    updateTextArea();
    drawWheel();
}

function updateTextArea() {
    document.getElementById("roster").value = names.join("\n");
}

function resetHistory() {
    history = [];
    updateHistory();
}

function copyHistory() {
    navigator.clipboard.writeText(history.join("\n"));
    alert("Copied!");
}

function exportRoster() {
    let blob = new Blob([names.join("\n")], { type: "text/plain" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roster.txt";
    a.click();
}

function importRoster() {
    let input = document.createElement("input");
    input.type = "file";

    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.onload = function() {
            document.getElementById("roster").value = reader.result;
            updateWheel();
        };

        reader.readAsText(file);
    };

    input.click();
}

function cleanRoster() {
    names = [...new Set(names.map(n => n.trim()))];
    updateTextArea();
    drawWheel();
}

function shuffleRoster() {
    names.sort(() => Math.random() - 0.5);
    updateTextArea();
    drawWheel();
}

function clearRoster() {
    names = [];
    updateTextArea();
    drawWheel();
}

/* LOAD DEFAULT */
updateWheel();
