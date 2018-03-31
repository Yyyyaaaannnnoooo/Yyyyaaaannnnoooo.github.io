let cnv;
let mono;
let fontSize = 14;
let letterCount = 0;
let lineCount = 0;
let counter = 0;
let yText = '';
const letterWidth = fontSize / 1.75;
function preload() {
  mono = loadFont('font/SourceCodePro-Black.otf');
}
function setup() {
  cnv = createCanvas(innerWidth, innerHeight);
  cnv.parent('p5');
  textFont(mono);
  textSize(fontSize);
  textLeading(fontSize);
  renderDiv();
  // createDiv(yText);
}

function draw() {
  // noStroke();
  // background(0, 255, 0)
  // fill(255);
  // ellipse(mouseX, mouseY, 200);
  // text(yText, 0, fontSize);
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
  renderDiv();
}

function makeYText() {
  let bBox;
  while (counter < 20000) {
    yText += 'y';
    if (letterCount * letterWidth > width - textWidth('y')) {
      yText += '\n'
      letterCount = 0;
      lineCount++;

    }
    if (fontSize * lineCount >= height) break;
    letterCount++;
    counter++;
    // if (counter > 50000) break;
  }
}

function convertToHTML(txt) {
  let pattern = '<br>';
  re = new RegExp(pattern, "g");
  txt.replace(re, '\n');
}

function renderDiv(){
  makeYText()
  convertToHTML(yText);
  document.getElementById('ytxt').innerHTML = yText;
}