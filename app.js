const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let names = [];
let angle = 0;
let spinning = false;

function drawWheel(){

const num = names.length;
const arc = 2 * Math.PI / num;

ctx.clearRect(0,0,canvas.width,canvas.height);

for(let i=0;i<num;i++){

const start = i * arc;

ctx.fillStyle = i % 2 === 0 ? "#ff7675" : "#74b9ff";

ctx.beginPath();
ctx.moveTo(300,300);
ctx.arc(300,300,300,start,start+arc);
ctx.fill();

ctx.save();
ctx.translate(300,300);
ctx.rotate(start + arc/2);

ctx.fillStyle="black";
ctx.font="16px Arial";
ctx.fillText(names[i],150,5);

ctx.restore();
}
}

document.getElementById("update").onclick = function(){

const input = document.getElementById("names").value;

names = input.split(",").map(n=>n.trim()).filter(n=>n);

drawWheel();

}

document.getElementById("spin").onclick = function(){

if(spinning || names.length===0) return;

spinning=true;

let spinAngle = Math.random()*2000 + 2000;

let start = Date.now();

function animate(){

let progress = Date.now() - start;

angle = spinAngle * (1-progress/3000);

ctx.setTransform(1,0,0,1,0,0);
ctx.translate(300,300);
ctx.rotate(angle*Math.PI/180);
ctx.translate(-300,-300);

drawWheel();

if(progress < 3000){

requestAnimationFrame(animate);

}else{

spinning=false;

let index = Math.floor(names.length - (angle%360)/360 * names.length) % names.length;

document.getElementById("result").innerText = "Selected: " + names[index];

}

}

animate();

}
