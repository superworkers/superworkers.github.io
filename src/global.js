//clarity.microsoft.com
;(function (c, l, a, r, i, t, y) {
  c[a] =
    c[a] ||
    function () {
      ;(c[a].q = c[a].q || []).push(arguments)
    }
  t = l.createElement(r)
  t.async = 1
  t.src = 'https://www.clarity.ms/tag/' + i
  y = l.getElementsByTagName(r)[0]
  y.parentNode.insertBefore(t, y)
})(window, document, 'clarity', 'script', 'tycw8osfaf')

/* Tag */
console.log(`███████ ██    ██ ██████  ███████ ██████  ██     ██  ██████  ██████  ██   ██
██      ██    ██ ██   ██ ██      ██   ██ ██     ██ ██    ██ ██   ██ ██  ██
███████ ██    ██ ██████  █████   ██████  ██  █  ██ ██    ██ ██████  █████
     ██ ██    ██ ██      ██      ██   ██ ██ ███ ██ ██    ██ ██   ██ ██  ██
███████  ██████  ██      ███████ ██   ██  ███ ███   ██████  ██   ██ ██   ██

We want you! Join our Discord: https://discord.gg/ng8RNjm5Jz`)

const audioPlayer = new Audio()
audioPlayer.playsInline = true
audioPlayer.volume = 1

const generateAudio = async (text, voice = 'echo') => {
  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, model: 'tts-1', voice }),
  })
  const audioBlob = await response.blob()
  return URL.createObjectURL(audioBlob)
}

const playAudio = async url => {
  if (!url) return
  return new Promise((resolve, reject) => {
    audioPlayer.src = url
    audioPlayer.onended = resolve
    audioPlayer.onerror = reject
    audioPlayer.play().catch(reject)
  })
}

const transcribe = async audioBlob => {
  const reader = new FileReader()
  const base64 = await new Promise(resolve => {
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(audioBlob)
  })
  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, model: 'whisper-1' }),
  })
  const result = await response.json()
  return result.text
}

const loadMarkdown = slug => {
  const markdownContent = document.getElementById('markdown-content')
  if (!markdownContent) return

  fetch('README.md')
    .then(response => response.text())
    .then(markdown => {
      markdownContent.innerHTML = marked.parse(markdown)
    })
}

const setupSegmentedControl = () => {
  const segments = document.querySelectorAll('.segment')
  if (!segments.length) return

  const page = window.location.pathname.split('/').filter(Boolean).pop()
  const slug = page?.replace('.html', '') || 'index'

  loadMarkdown(slug)

  segments.forEach(segment => {
    segment.addEventListener('click', () => {
      const view = segment.dataset.view
      const demoSections = document.querySelectorAll('.demo')
      const aboutSection = document.getElementById('about')

      segments.forEach(s => s.classList.remove('active'))
      segment.classList.add('active')

      if (view === 'demo') {
        demoSections.forEach(section => section.classList.remove('hidden'))
        aboutSection.classList.add('hidden')
      } else {
        demoSections.forEach(section => section.classList.add('hidden'))
        aboutSection.classList.remove('hidden')
      }
    })
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSegmentedControl)
} else {
  setupSegmentedControl()
}
