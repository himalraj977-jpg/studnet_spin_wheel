const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const students = [
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
"#FF6384",
"#36A2EB",
"#FFCE56",
"#4CAF50",
"#FF9800",
"#9C27B0",
"#00BCD4",
"#E91E63"
];

const arc = (2 * Math.PI) / students.length;

let startAngle = 0;

function drawWheel(){

    for(let i=0;i<students.length;i++){

        let angle = startAngle + i * arc;

        ctx.beginPath();
        ctx.fillStyle = colors[i];
        ctx.moveTo(250,250);

        ctx.arc(250,250,250,angle,angle+arc);

        ctx.lineTo(250,250);
        ctx.fill();

        ctx.save();

        ctx.translate(250,250);
        ctx.rotate(angle + arc/2);

        ctx.fillStyle = "white";
        ctx.font = "18px Arial";

        ctx.fillText(students[i],120,10);

        ctx.restore();
    }
}

drawWheel();

function spin(){

    let spinAngle = Math.random() * 360 + 720;

    startAngle += spinAngle * Math.PI/180;

    ctx.clearRect(0,0,500,500);

    drawWheel();

    let index = Math.floor(Math.random()*students.length);

    document.getElementById("result").innerHTML =
    "Selected Student: " + students[index];
}
