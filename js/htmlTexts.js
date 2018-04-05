const htmlTexts = [
    "Hi I'm YANO!I'm an artist and creative coder",
    `I'm currently working at the <a href="https://www.ixdm.ch/">Critical Media Lab</a> as a programmer for the research project <a href="https://www.ixdm.ch/portfolio/thinking-toys-for-commoning/">"Thinking Toys (or Games) for Commoning"</a>.`,
    `As part of the research group I'm mainly involved in the development of <a href="https://github.com/commoningToys">Agent Based Models</a> and our amazing <a href="http://commoning.rocks/">website</a>.`
];
const textsNum = htmlTexts.length;
const span = makeSpans();
function makeSpans(){
    let arr = [];
    for(let i = 0; i < textsNum; i++){
        arr.push('<span id="span'+i+'" class="mySpans" onclick="revealText('+i+')">y</span>')
    }
    return arr;
}