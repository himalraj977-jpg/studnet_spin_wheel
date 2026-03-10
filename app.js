const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let names = ["Alice","Bob","Charlie","David","Eve"];

let startAngle = 0;

function drawWheel(){

let arc = Math.PI * 2 / names.length;

ctx.clearRect(0,0,500,500);

for(let i=0;i<names.length;i++){

let angle = startAngle + i * arc;

ctx.beginPath();

let colors=["#ff7675","#74b9ff","#55efc4","#ffeaa7","#a29bfe"];
ctx.fillStyle = colors[i % colors.length];

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

document.getElementById("spinBtn").onclick = spinWheel;

function spinWheel(){

let spinAngle = Math.random()*10 + 10;

let spinTime = 0;

let spinDuration = 3000;

function rotate(){

spinTime += 30;

if(spinTime >= spinDuration){

stopWheel();

return;

}

startAngle += spinAngle * Math.PI/180;

drawWheel();

requestAnimationFrame(rotate);

}

rotate();

}

function stopWheel(){

let degrees = startAngle * 180 / Math.PI + 90;

let arc = 360 / names.length;

let index = Math.floor((360 - degrees % 360) / arc);

document.getElementById("result").innerHTML =
"Winner: " + names[index];

}

function addName(){

let name=document.getElementById("nameInput").value;

if(name==="") return;

names.push(name);

drawWheel();

clearInput();

}

function removeName(){

names.pop();

drawWheel();

}

function resetWheel(){

names=[];

drawWheel();

document.getElementById("result").innerHTML="";

}

/* ----------- 6 NEW FUNCTIONS ----------- */

/* 1 Clear input */
function clearInput(){
document.getElementById("nameInput").value="";
}

/* 2 Shuffle names */
function shuffleNames(){

for(let i=names.length-1;i>0;i--){

let j=Math.floor(Math.random()*(i+1));

[names[i],names[j]]=[names[j],names[i]];

}

drawWheel();

}

/* 3 Show total names */
function showTotal(){

alert("Total names in wheel: "+names.length);

}

/* 4 Add random name */
function addRandom(){

let randomName="Student"+Math.floor(Math.random()*100);

names.push(randomName);

drawWheel();

}

/* 5 Save names */
function saveNames(){

localStorage.setItem("wheelNames",JSON.stringify(names));

alert("Names saved");

}

/* 6 Load names */
function loadNames(){

let saved=localStorage.getItem("wheelNames");

if(saved){

names=JSON.parse(saved);

drawWheel();

alert("Names loaded");

}

}
