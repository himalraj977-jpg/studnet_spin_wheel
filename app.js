const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const students = [
"Alice",
"Bob",
"Charlie",
"David",
"Emma",
"Frank"
];

const colors = [
"red",
"blue",
"green",
"orange",
"purple",
"pink"
];

const centerX = 250;
const centerY = 250;
const radius = 200;

function drawWheel(){

const slice = 2 * Math.PI / students.length;

for(let i = 0; i < students.length; i++){

let angle = i * slice;

ctx.beginPath();
ctx.moveTo(centerX, centerY);

ctx.fillStyle = colors[i];

ctx.arc(centerX, centerY, radius, angle, angle + slice);

ctx.fill();

ctx.save();

ctx.translate(centerX, centerY);
ctx.rotate(angle + slice/2);

ctx.fillStyle = "white";
ctx.font = "16px Arial";

ctx.fillText(students[i], 100, 10);

ctx.restore();
}

}

drawWheel();

function spin(){

let random = Math.floor(Math.random() * students.length);

document.getElementById("result").innerHTML =
"Selected Student: " + students[random];

}
