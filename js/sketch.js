let cnv;
let mono;
let fontSize = 24;
let letterCount = 0;
let lineCount = 0;
let counter = 0;
let spanCounter = 0;
let yText = '';
// let span = '<span id="span0" class="mySpans" onclick="revealText(0)">y</span>'
const letterWidth = fontSize / 1.65;
let arrow;
let flock;
function preload() {
  mono = loadFont('font/SourceCodePro-Black.otf');
  arrow = loadImage('./cursor.svg', () => {
    flock = new Flock(arrow, 10);
  });

}
function setup() {
  cnv = createCanvas(innerWidth, innerHeight);
  cnv.parent('p5');
  textFont(mono);
  textSize(fontSize);
  textLeading(fontSize);
  imageMode(CENTER);
  // renderDiv();
  // createDiv(yText);
}

function draw() {
  background(0)
  // noStroke();
  // background(0, 255, 0)
  // fill(255);
  // ellipse(mouseX, mouseY, 200);
  // text(yText, 0, fontSize);
  if (flock != null || undefined) {
    flock.update();
    flock.show();
  }
  // image(arrow, mouseX - 100, mouseY - 100);
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
  // renderDiv();
}

function makeYText() {
  let bBox;
  yText = '';
  counter = 0;
  lineCount = 0;
  spanCounter = 0;
  while (counter < 20000) {
    yText += 'y';
    if (letterCount * letterWidth > innerWidth - textWidth('y')) {
      yText += '<br>'
      letterCount = 0;
      lineCount++;
    }
    if (Math.random() * 100 < 0.5 && spanCounter < span.length) {
      // if (counter < span.length) {
      console.log('add Span')
      yText += span[spanCounter];
      letterCount++;
      spanCounter++;
      // }
    }
    if (fontSize * lineCount >= innerHeight - fontSize) break;
    letterCount++;
    counter++;
    // if (counter > 50000) break;
  }
}

function convertToHTML(txt) {
  let pattern = '<br>';
  re = new RegExp(pattern, "g");
  return txt.replace(re, '\n');
}

function renderDiv() {
  makeYText();
  let index = Math.floor(Math.random() * yText.length);
  // yText.replace('y', span);
  document.getElementById('ytxt').innerHTML = yText;
}

function revealText(val) {
  document.getElementById('span' + val).innerHTML = htmlTexts[val];
}