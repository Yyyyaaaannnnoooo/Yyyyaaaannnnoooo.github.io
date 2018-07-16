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
let pos;

function setup() {
  cnv = createCanvas(100, 75);
  cnv.parent('p5Sketch');
  pos = createVector(width / 2, height / 2);
}

function draw() {

  background(255);
  strokeWeight(3)
  let r = height - 5;
  if (mousex < w() - width) {
    targetx = map(mousex, 0, w() * 2, 0, width);
    // targety = map(mousey, 0, h * 2, 0, height);
  } else {
    targetx = map(mousex, w() - width, w(), 0, width);
    // targety = map(mousey, 0, h * 2, 0, height);
  }

  if (mousey < h() - height) {
    // targetx = map(mousex, 0, w * 2, 0, width);
    targety = map(mousey, 0, h() * 2, 0, height);
  } else {

    // targetx = map(mousex, 0, w * 2, 0, width);
    targety = map(mousey, h() - height, h(), 0, height);
  }
  let angle = atan2(targety - pos.y, targetx - pos.x);
  push()
  translate(pos.x, pos.y);
  noFill();
  ellipse(0, 0, r);
  rotate(angle);
  noStroke();
  fill(0, 150, 200);
  ellipse(r / 3.5, 0, r * 0.35);
  pop();
}