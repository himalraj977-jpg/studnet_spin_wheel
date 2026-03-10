const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const names = [
"Alice",
"Bob",
"Charlie",
"David",
"Emma",
"Frank",
"Grace",
"Helen"
];

const colors = [
"red",
"blue",
"green",
"orange",
"purple",
"pink",
"cyan",
"gold"
];

const centerX = 250;
const centerY = 250;
const radius = 200;

function drawWheel(){

const slice = 2*Math.PI / names.length;

for(let i=0;i<names.length;i++){

let angle = i*slice;

ctx.beginPath();

ctx.moveTo(centerX,centerY);

ctx.fillStyle = colors[i];

ctx.arc(centerX,centerY,radius,angle,angle+slice);

ctx.fill();

ctx.save();

ctx.translate(centerX,centerY);
ctx.rotate(angle + slice/2);

ctx.fillStyle="white";
ctx.font="16px Arial";

ctx.fillText(names[i],100,10);

ctx.restore();

}

}

drawWheel();

function spinWheel(){

let randomIndex = Math.floor(Math.random()*names.length);

document.getElementById("result").innerHTML =
"Selected Student: " + names[randomIndex];

}
