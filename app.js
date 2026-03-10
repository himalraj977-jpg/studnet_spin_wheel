const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let names = [
"Alice",
"Bob",
"Charlie",
"David",
"Eve"
];

let startAngle = 0;

function drawWheel(){

let arc = Math.PI * 2 / names.length;

ctx.clearRect(0,0,500,500);

for(let i=0;i<names.length;i++){

let angle = startAngle + i * arc;

ctx.beginPath();

ctx.fillStyle = i % 2 === 0 ? "#FFD700" : "#87CEFA";

ctx.moveTo(250,250);

ctx.arc(250,250,250,angle,angle+arc);

ctx.lineTo(250,250);

ctx.fill();

ctx.save();

ctx.fillStyle="black";

ctx.translate(250,250);

ctx.rotate(angle + arc/2);

ctx.textAlign="right";

ctx.font="16px Arial";

ctx.fillText(names[i],200,10);

ctx.restore();

}

}

drawWheel();

document.getElementById("spinBtn").onclick = function(){

let spinAngle = Math.random()*10 + 10;

let spinTime = 0;

let spinDuration = 3000;

function rotateWheel(){

spinTime += 30;

if(spinTime >= spinDuration){

stopRotateWheel();

return;

}

startAngle += spinAngle * Math.PI/180;

drawWheel();

requestAnimationFrame(rotateWheel);

}

rotateWheel();

}

function stopRotateWheel(){

let degrees = startAngle * 180 / Math.PI + 90;

let arc = 360 / names.length;

let index = Math.floor((360 - degrees % 360) / arc);

document.getElementById("result").innerHTML =
"Winner: " + names[index];

}

function addName(){

let name = document.getElementById("nameInput").value;

if(name==="") return;

names.push(name);

drawWheel();

}

function removeName(){

names.pop();

drawWheel();

}

function resetWheel(){

names = [];

drawWheel();

document.getElementById("result").innerHTML="";

}
