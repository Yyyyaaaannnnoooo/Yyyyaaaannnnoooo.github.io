let cnv;
function setup() {
  cnv = createCanvas(innerWidth, innerHeight);
  cnv.parent('p5');
}

function draw() {
  background(0, 255, 0)
  fill(255);
  ellipse(mouseX, mouseY, 200);
}

function windowResized(){
  resizeCanvas(innerWidth, innerHeight);
}