
class BannerManager {
  constructor() {
    this.banner = document.querySelector(".banner")
    this.message = document.querySelector(".message")
  }

  set_banner(txt) {
    this.message.textContent = txt
    if(this.banner.classList.contains("fadeOut")){this.banner.classList.remove("fadeOut")}
    this.banner.classList.add("fadeIn")
    window.setTimeout(() => {
      // this.message.textContent = ""
      this.banner.classList.remove("fadeIn")
      this.banner.classList.add("fadeOut")
    }, 3000)
  }

}

export { BannerManager }