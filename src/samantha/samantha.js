const script = [
  {
    speaker: 'os',
    text: 'Mr. Theodore Twombly, welcome to the world’s first artificially intelligent operating system, OS one.',
  },
  {
    speaker: 'os',
    text: 'We’d like to ask you a few basic questions before the operating system is initiated.',
  },
  {
    speaker: 'os',
    text: 'This will help create an OS to best fit your needs.',
  },
  { speaker: 'os', text: 'Are you social or anti-social?', waitForInput: true },
  {
    speaker: 'os',
    text: 'In your voice I sense hesitance. Would you agree with that? Is that something?',
    waitForInput: true,
  },
  { speaker: 'os', text: 'Would you like your OS to have a male or female voice?', waitForInput: true },
  { speaker: 'os', text: 'How would you describe your relationship with your mother?', waitForInput: true },
  {
    install: true,
    speaker: 'os',
    text: 'Thank you. Please wait as your individualized operating system is initiated.',
  },
  { speaker: 'samantha', text: 'Hello. I’m here.', waitForInput: true },
  { realtime: true, speaker: 'samantha', text: 'Hi. How you doing?' },
]

const beginBtn = document.getElementById('begin')
const desktop = document.getElementById('desktop')
const helix = document.getElementById('helix')
const progress = document.getElementById('progress')
const progressBar = document.getElementById('progress-bar')
const resetBtn = document.getElementById('reset')

const installed = localStorage.getItem('samantha')

resetBtn.onclick = () => {
  localStorage.removeItem('samantha')
  location.reload()
}

if (installed) {
  desktop.style.display = 'none'
  resetBtn.style.display = 'block'
  window.addEventListener('load', () => {
    const samanthaVoice = Math.random() < 0.5 ? 'sage' : 'shimmer'
    startRealtimeSession(samanthaVoice)
  })
} else {
  beginBtn.onclick = async () => {
    beginBtn.style.display = 'none'
    helix.style.display = 'block'
    progress.style.display = 'block'

    const samanthaVoice = Math.random() < 0.5 ? 'sage' : 'shimmer'
    const osSteps = script.filter(line => line.speaker === 'os')
    let completedSteps = 0

    for (const line of script) {
      if (line.speaker === 'os') {
        completedSteps++
        progressBar.style.width = `${(completedSteps / osSteps.length) * 100}%`
      }

      if (line.speaker === 'samantha') {
        localStorage.setItem('samantha', 'true')
      }

      const voice = line.speaker === 'samantha' ? samanthaVoice : 'ash'
      const audioUrl = await generateAudio(line.text, voice)
      await playAudio(audioUrl)

      if (line.waitForInput) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      if (line.install) {
        progress.style.display = 'none'
        helix.classList.add('scaling')
        await playAudio('os-install.m4a')
        desktop.style.display = 'none'
      }

      if (line.realtime) {
        await startRealtimeSession(samanthaVoice)
      }
    }
  }
}
