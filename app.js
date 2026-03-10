const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

let students = [
"Alice",
"Bob",
"Charlie",
"David"
];

const colors = [
"#FF6384",
"#36A2EB",
"#FFCE56",
"#4CAF50",
"#FF9800",
"#9C27B0",
"#00BCD4",
"#E91E63"
];

const centerX = 250;
const centerY = 250;
const radius = 220;

let startAngle = 0;

function drawWheel(){

ctx.clearRect(0,0,500,500);

let slice = 2*Math.PI / students.length;

for(let i=0;i<students.length;i++){

let angle = startAngle + i*slice;

ctx.beginPath();

ctx.moveTo(centerX,centerY);

ctx.fillStyle = colors[i % colors.length];

ctx.arc(centerX,centerY,radius,angle,angle+slice);

ctx.fill();

ctx.save();

ctx.translate(centerX,centerY);
ctx.rotate(angle + slice/2);

ctx.fillStyle="white";
ctx.font="18px Arial";

ctx.fillText(students[i],120,10);

ctx.restore();

}

}

drawWheel();

function spin(){

let spinAngle = Math.random()*360 + 720;

startAngle += spinAngle * Math.PI/180;

drawWheel();

let index = Math.floor(Math.random()*students.length);

document.getElementById("result").innerHTML =
"Selected Student: " + students[index];

}

function addStudent(){

let name = document.getElementById("studentName").value;

if(name===""){
alert("Enter a student name");
return;
}

students.push(name);

document.getElementById("studentName").value="";

drawWheel();

}

function resetWheel(){

students = [];

drawWheel();

document.getElementById("result").innerHTML="Wheel Reset";

}
