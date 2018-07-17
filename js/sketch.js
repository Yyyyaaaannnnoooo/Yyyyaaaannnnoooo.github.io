let mousex = 0;
let mousey = 0;
function w() {
  return innerWidth
}
function h() {
  return innerHeight
}
document.onmousemove = function mouseCoord(event) {
  mousex = event.clientX;
  mousey = event.clientY;
  console.log(mousex, mousey);
}
let cnv;
// let pos;

function setup() {
  cnv = createCanvas(innerWidth, innerHeight);
  cnv.parent('p5Sketch');
  // pos = createVector(width * 0.85, height * 0.85);
}

function draw() {

  background(255);
  strokeWeight(3);
  let angle = atan2(mouseY - pos().y, mouseX - pos().x);
  push()
  translate(pos().x, pos().y);
  noFill();
  ellipse(0, 0, r());
  rotate(angle);
  noStroke();
  fill(0, 150, 200);
  ellipse(r() / 3.5, 0, r() * 0.35);
  fill(0);
  ellipse(r() / 3, 0, r() * 0.15);
  pop();
}
function r(){
  return height / 10;
}
function pos(){
  return createVector (width - (r() / 1.5), height - (r() / 1.5));
}
function windowResized(){
  resizeCanvas(innerWidth, innerHeight);
}