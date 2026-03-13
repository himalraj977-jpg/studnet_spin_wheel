const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let names = [];
let history = [];
let removedStack = [];

let startAngle = 0;
let arc;

const colors = [
"#FF6B6B",
"#4ECDC4",
"#FFD93D",
"#6A4C93",
"#00BBF9",
"#F15BB5",
"#9B5DE5",
"#00F5D4"
];

function updateWheel(){

const input = document.getElementById("names").value;

names = input.split("\n").filter(n => n.trim() !== "");

drawWheel();

}

function drawWheel(){

if(names.length === 0) return;

arc = Math.PI * 2 / names.length;

ctx.clearRect(0,0,canvas.width,canvas.height);

for(let i=0;i<names.length;i++){

let angle = startAngle + i * arc;

ctx.fillStyle = colors[i % colors.length];

ctx.beginPath();
ctx.moveTo(300,300);
ctx.arc(300,300,300,angle,angle+arc,false);
ctx.lineTo(300,300);
ctx.fill();

ctx.save();

ctx.fillStyle="black";
ctx.translate(300,300);
ctx.rotate(angle + arc/2);
ctx.textAlign="right";
ctx.font="20px Arial";
ctx.fillText(names[i],280,10);

ctx.restore();

}

}

function spin(){

let spinAngle = Math.random()*2000 + 3000;

startAngle += spinAngle * Math.PI/180;

drawWheel();

let degrees = startAngle * 180/Math.PI + 90;
let arcd = arc * 180/Math.PI;
let index = Math.floor((360 - degrees % 360) / arcd);

let winner = names[index];

document.getElementById("winner").innerHTML = "Winner: " + winner;

history.push(winner);

}

function shuffleNames(){

for(let i = names.length -1; i>0; i--){

let j = Math.floor(Math.random() * (i+1));

[names[i],names[j]]=[names[j],names[i]];

}

document.getElementById("names").value = names.join("\n");

drawWheel();

}

function clearNames(){

names=[];

document.getElementById("names").value="";

ctx.clearRect(0,0,canvas.width,canvas.height);

}

function cleanRoster(){

names = [...new Set(names.map(n=>n.trim()).filter(n=>n!=""))];

document.getElementById("names").value = names.join("\n");

drawWheel();

}

function removeWinner(){

let winnerText = document.getElementById("winner").innerText;

if(!winnerText) return;

let winner = winnerText.replace("Winner: ","");

let index = names.indexOf(winner);

if(index>-1){

removedStack.push(winner);

names.splice(index,1);

document.getElementById("names").value = names.join("\n");

drawWheel();

}

}

function undoRemove(){

if(removedStack.length===0) return;

let name = removedStack.pop();

names.push(name);

document.getElementById("names").value = names.join("\n");

drawWheel();

}

function resetHistory(){

history=[];

alert("History Reset");

}

function copyHistory(){

navigator.clipboard.writeText(history.join("\n"));

alert("History Copied");

}

function exportHistory(){

let blob = new Blob([history.join("\n")],{type:"text/plain"});

let a = document.createElement("a");

a.href = URL.createObjectURL(blob);

a.download="history.txt";

a.click();

}

function exportRoster(){

let blob = new Blob([names.join("\n")],{type:"text/plain"});

let a=document.createElement("a");

a.href=URL.createObjectURL(blob);

a.download="roster.txt";

a.click();

}

function importRoster(){

document.getElementById("fileInput").click();

}

document.getElementById("fileInput").addEventListener("change",function(){

let file = this.files[0];

let reader = new FileReader();

reader.onload=function(e){

document.getElementById("names").value=e.target.result;

updateWheel();

};

reader.readAsText(file);

});
