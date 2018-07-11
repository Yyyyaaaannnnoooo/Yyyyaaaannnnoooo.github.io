p5.disableFriendlyErrors = true; //this should improve performance
let flock;
let mono;
let originText = ['T', 'O', 'Y', 'S', ' '];
let destinationText = ['G', 'A', 'M', 'E', 'S'];
let swaptext = ['T', 'O', 'Y', 'S', ' '];
let charIndex = 0, displayText = '', indexArray = [];
let Alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
	'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
	'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ' '];
let indexes = makeIndexes(Alphabet);

function preload() {
	mono = loadFont('font/SourceCodePro-Black.otf');
}
function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}
function setup() {
	// let div = document.getElementById('myContainer');
	// let w = div.offsetWidth;
	// let h = div.offsetHeight;
	textFont(mono);
	let cnv = createCanvas(windowWidth, windowHeight);
	cnv.position(0, 0);
	cnv.style('z-index', '-1');
	cnv.style('position', 'fixed')
	flock = new Flock(10);
	let myCnv = document.getElementById('defaultCanvas0');
	myCnv.style.position = 'fixed';
	textAlign(CENTER)
}

function draw() {
	background(255);
	flock.update();
	flock.show();
	if (mouseIsPressed) flock.formSentence(mouseX, mouseY);
	else flock.setFormingSentence(false);
	//here we change the text
	textSize(txtSize());
	if (frameCount % 4 == 0) {
		if (swaptext[charIndex] != destinationText[charIndex]) {
			let randIndex;
			randIndex = floor(random(indexes.length));
			let index = indexes[randIndex];
			indexes.splice(randIndex, 1);//remove that index
			swaptext[charIndex] = Alphabet[index];
		} else {
			charIndex++;
			indexes = makeIndexes(Alphabet);
			// indexArray = [];
		}
		if (charIndex >= destinationText.length) {
			charIndex = 0;
			swapText(originText, destinationText);
		}
	}
	displayText = swaptext.join('');
	document.getElementById('title2').innerHTML = displayText;
	// push()
	// translate(width / 2, height / 2)
	// rotate(PI/8)
	// let txt = 'THINKING \n' + displayText + '\nFOR\nCOMMONING';
	// let txtW = textWidth(txt);
	// text(txt, 0, 0);
	// pop()
}
/**
 * 
 * @param {array} arr 
 * @returns {array}
 */
function makeIndexes(arr) {
	let resultArray = [];
	for (let i = 0; i < arr.length; i++) {
		resultArray[i] = i;
	}
	return resultArray;
}

/**
 * function that swaps to char arrays
 * @param {char} arr1 - array of chars to be swapped
 * @param {char} arr2 - array of chars to be swapped
 */
function swapText(arr1, arr2) {
	let swap = [];
	// console.log([arr1, arr2]);
	for (let i = 0; i < arr1.length; i++)swap[i] = arr1[i];
	for (let i = 0; i < arr1.length; i++)arr1[i] = arr2[i];
	for (let i = 0; i < arr1.length; i++)arr2[i] = swap[i];
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	console.log(txtSize())	
}

function txtSize() {
	let w = width;
	let h = height;
	if (w < h) return w / h * 90;
	else return h / w * 90;
}