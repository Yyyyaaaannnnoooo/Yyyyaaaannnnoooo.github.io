/**
 * BACKGROUND TEXT
 */
let selectedText = '';
let SI = undefined;
let write = true;
$(window).mouseup(() => {
  if (SI != undefined) clearInterval(SI);
  let index = 0;
  selectedText = '';
  write = true;
  selectedText = getSelectedText().split('');
  if (selectedText != '') {
    SI = setInterval(() => {
      let myDiv = document.getElementById('selected-text');
      if (write) {
        let letter = selectedText[index];
        myDiv.innerHTML += letter;
        myDiv.scrollTop = myDiv.scrollHeight;
        index++;
      }
      if (index >= selectedText.length) {
        write = false;
        setTimeout(() => {
          myDiv.innerHTML = '';
          clearInterval(SI);
        }, 2000);
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

/**
 * CHANGE WEBSITE TITLE DYNAMICALLY WITH EMOJI
 */
const EMOJIS = [
  '🦑',
  '🍑',
  '🐋',
  '🌏',
  '🌍',
  '🌎',
  '🌈',
  '🌞',
  '🏩',
  '🕳',
]
setInterval(() => {
  document.title = randomEmoji() + randomEmoji() + randomEmoji();
}, 2000);

function randomEmoji(){
  let randIndex = Math.floor(Math.random() * EMOJIS.length);
  return EMOJIS[randIndex];
}
/**
 * EYE ANIMATION
 */
function w() {
  return innerWidth
}
function h() {
  return innerHeight
}

let cnv;

function setup() {
  cnv = createCanvas(innerWidth, innerHeight);
  cnv.parent('p5Sketch');
}

function draw() {
  background(255);
  strokeWeight(2.5);
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
  return height / 15;
}
function pos() {
  return createVector(width - (r() / 1.8), height - (r() / 1.8));
}
function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
}