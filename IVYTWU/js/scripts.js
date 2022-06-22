fetch('data/yt_data.json')
  .then(sad_people => sad_people.json())
  .then(sad_people => read_data(sad_people))
  .catch(err => console.log(err))

const main_div = document.querySelector('div.main')

const read_data = sad_people => {
  // prune datapoints without transcript
  sad_people = sad_people.filter(person => person.transcript)

  sad_people = sad_people.sort((a, b) => b.statistics.viewCount - a.statistics.viewCount)
  console.log(sad_people)
  for (let i = 0; i < sad_people.length; i++) { //sad_people.length
    const sad_person = sad_people[i]
    const img_url = sad_person.snippet.thumbnails.default.url
    // const img = document.createElement('img')
    // img.src = img_url

    const title = sad_person.snippet.title
    const title_div = document.createElement('p')
    title_div.textContent = title

    const date = new Date(sad_person.snippet.publishedAt).toUTCString()
    const reach = sad_person.statistics.viewCount

    const img_container = document.createElement('div')
    img_container.classList.add(['img-container'])
    img_container.setAttribute('data-index', i)
    img_container.setAttribute('data-title', date)
    img_container.setAttribute('data-reach', reach)
    img_container.appendChild(title_div)
    img_container.style.backgroundImage = `url(${img_url})`
    // img_container.appendChild(img)

    img_container.addEventListener('click', e => {
      // console.log(img_container)
      const index = img_container.dataset.index
      const transcript = sad_person.transcript.map(element => element.text).join(' ')

      play = !play
      speak(transcript)
    })

    main_div.appendChild(img_container)
    if (i === sad_people.length - 1) {
      make_tooltips()
    }
  }
}
const synth = window.speechSynthesis;
const speak = (speech_text) => {

  synth.cancel()

  // first we check wether the argument is text or an object
  // if it is an object than we use the inner text of the question
  let sp_text = speech_text
  if (typeof speech_text === 'object') {
    sp_text = current_question
  }
  const speech = new SpeechSynthesisUtterance(sp_text)

  // const cool_voices_names = ['Bells', 'Bad News', 'Cellos', 'Good News', 'Pipe Organ', 'Trinoids', 'Zarvox']
  const cool_voices_names = ['Alex']
  console.log(synth.getVoices())
  const voices_list = synth.getVoices().filter(result => {
    for (const voice of cool_voices_names) {
      if (result.name === voice) return result
    }
    // if(result.lang.includes('en'))return result
  })
  const random_idx = Math.floor(Math.random() * voices_list.length)
  const voice = voices_list[random_idx]
  speech.voice = voice
  // speech.rate = 0.1
  speech.volume = 1
  synth.speak(speech)
  type_speak(speech.text)
}

let type_interval
let type_index = 0
const speak_box = document.getElementById('speak-box')
/**
 * types a sententence in the speak box
 * @param {String} term a sentence to be typed as a typewriter
 */
function type_speak(term) {
  clearInterval(type_interval)
  const char_array = term.split('')

  type_index = 0
  speak_box.innerText = ''
  type_interval = setInterval(() => {
    const c = char_array[type_index]
    if (c == ' ') speak_box.innerHTML += '&nbsp;'
    speak_box.innerText += c
    type_index++
    check_scroll()
    if (type_index >= term.length) clearInterval(type_interval)
  }, 50)
}

// function that scrolls down when text reachse bottom of div
const scroll_down = () => {
  const scroll_div = document.getElementById('speak-box')
  scroll_div.scrollTop = scroll_div.scrollHeight
}
// function that checks if the typed text has reached the bottom of the div
const check_scroll = () => {
  const scroll_div = document.getElementById('speak-box')
  const scroll_div_height = scroll_div.scrollHeight
  const div_height = scroll_div.offsetHeight
  console.log(scroll_div_height, div_height);
  if (scroll_div_height > div_height) {
    scroll_down()
  }
}

let play = true

const pause = () => {
  if (play) {
    synth.resume()
  } else {
    synth.pause()
  }
}

window.addEventListener('keypress', (event) => {
  if (event.key === 'p') {
    play = !play
    pause()
  }
})


// suggestions tips

const help_tip = document.querySelector('div.tooltip')
console.log(help_tip);
document.onmousemove = mouse => {
  help_tip.style.top = mouse.y - 10 + 'px';
  help_tip.style.left = mouse.x + 10 + 'px';
}
function make_tooltips() {
  const tooltips_el = document.querySelectorAll('[data-title]')
  tooltips_el.forEach(tip => {
    tip.addEventListener('mouseover', elt => {
      help_tip.innerHTML = `MEMBER SINCE: <br>
      ${tip.dataset['title']}<br>
      REACH:<br>
      ${tip.dataset['reach']}`;
      help_tip.style.display = 'block';
    })
    tip.addEventListener('mouseleave', elt => {
      help_tip.style.display = 'none';
    })
  })
}
