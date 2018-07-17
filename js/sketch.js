function w() {
  return innerWidth
}
function h() {
  return innerHeight
}
let selectedText = '';
$(window).mouseup(() => {
  clearInterval();
  let index = 0;
  selectedText = ''
  selectedText = getSelectedText().split('');
  if (selectedText != '') {
    console.log(selectedText);
    let SI = setInterval(() => {
      let myDiv = document.getElementById('selected-text');
      console.log(selectedText[index])
      let letter = selectedText[index];
      myDiv.innerHTML += letter;
      myDiv.scrollTop = myDiv.scrollHeight;
      index++;
      if (index >= selectedText.length) {
        myDiv.innerHTML = '';
        clearInterval(SI);
      }
    }, 100);

  }
});

function getSelectedText() {
  if (window.getSelection) {
    return window.getSelection().toString();
  } else if (document.selection) {
    return document.selection.createRange().text;
  }
  return '';
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
function r() {
  return height / 10;
}
function pos() {
  return createVector(width - (r() / 1.5), height - (r() / 1.5));
}
function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
}