import * as THREE from 'three';
class AudioComponent {
  constructor(listener, game_loaded) {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    // Make sure context exists before calling createGain
    if (!this.context) {
      console.error('AudioContext not initialized!');
      return;
    }
    this.sound = null;
    this.sound_paused = true;
    this.listener = listener
    // this.listener = new THREE.AudioListener();
    // console.log(listener);
    this.game_loaded = game_loaded
  }

  init() {
    console.log("init sound");
    this.sound = new THREE.Audio(this.listener);
    // this.sound.context = this.context;
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('./audio/liminal-ambient.wav', (buffer) => {
      this.sound.setBuffer(buffer);
      this.sound.setLoop(true);
      this.sound.setVolume(0.095); // Adjust volume
      console.log("audio loaded");
      // Progress Loading
      const audio_info = document.querySelector("#audio-info")
      audio_info.innerHTML = ''
      audio_info.textContent = "Loaded"
      this.game_loaded.audio = true
      this.init_interactions()
    });
  }

  // Function to pause/resume audio
  handleAudio() {
    if (document.hidden || !document.hasFocus()) {
      if (this.sound_paused === false) this.sound.pause(); // Pause when tab is hidden or user switches apps
    } else {
      if (this.sound_paused === false) this.sound.play(); // Resume when user returns
    }
  }

  init_interactions() {// Detect when user switches tabs
    document.addEventListener("visibilitychange", () => {
      this.handleAudio()
    });

    // Detect when user switches to another app
    window.addEventListener("blur", () => {
      this.handleAudio()
    });
    window.addEventListener("focus", () => {
      this.handleAudio()
    });

    document.querySelector("#volume-slider").addEventListener("input", (event) => {
      const volume = event.target.value;
      this.sound.setVolume(volume / 100);
    });
  }

  play() {
    setTimeout(() => {
      this.sound.play();
      this.sound_paused = false
    }, 200);
  }
  pause() {
    setTimeout(() => {
      this.sound.pause();
      this.sound_paused = true
    }, 200);
  }
  paused() {
    return this.sound_paused
  }
}
export { AudioComponent }