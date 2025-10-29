const BRAND = 1

const frames = document.querySelectorAll('#cycle img')
let i = 0

const swap = () => {
  frames.forEach(s => s.classList.remove('active'))
  frames[i % frames.length].classList.add('active')
  i++
}

const cycle = () => {
  if (i < 15) {
    swap()
    setTimeout(cycle, 200)
  } else {
    frames.forEach(s => s.classList.remove('active'))
    frames[BRAND].classList.add('active')
    setTimeout(() => {
      i = 0
      cycle()
    }, 3000)
  }
}

cycle()

/* Tag */

console.log(`███████ ██    ██ ██████  ███████ ██████  ██     ██  ██████  ██████  ██   ██ 
██      ██    ██ ██   ██ ██      ██   ██ ██     ██ ██    ██ ██   ██ ██  ██  
███████ ██    ██ ██████  █████   ██████  ██  █  ██ ██    ██ ██████  █████   
     ██ ██    ██ ██      ██      ██   ██ ██ ███ ██ ██    ██ ██   ██ ██  ██  
███████  ██████  ██      ███████ ██   ██  ███ ███   ██████  ██   ██ ██   ██

We want you! Join our Discord: https://discord.gg/ng8RNjm5Jz`)
