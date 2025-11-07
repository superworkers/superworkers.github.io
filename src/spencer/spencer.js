const jobs = [
  { id: 1, title: 'Senior Software Engineer', department: 'Engineering' },
  { id: 2, title: 'Product Manager', department: 'Product' },
  { id: 3, title: 'UX Designer', department: 'Design' },
]

const defaultQuestions = [
  'Tell me about yourself and your background.',
  'What interests you about this role?',
  'Describe a challenging project you worked on.',
  'How do you handle disagreements with team members?',
  'What are your greatest strengths?',
  'What areas are you working to improve?',
  'Where do you see yourself in 3 years?',
  'Why do you want to work at our company?',
  'Tell me about a time you failed and what you learned.',
  'Do you have any questions for us?',
]
const loadQuestions = () => {
  try {
    const saved = localStorage.getItem('questions')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length) return parsed
    } else {
      localStorage.setItem('questions', JSON.stringify(defaultQuestions))
    }
  } catch (_) {
    // ignore
  }
  return [...defaultQuestions]
}
const questions = loadQuestions()

let currentJob = null
let currentCandidate = null
let currentQuestionText = ''
let dc = null
let pc = null
let startTime = null
let transcript = []
const seenTranscripts = new Set()
let analysisGenerated = false

const recordTranscript = (role, text, key, showInLog = role === 'user') => {
  const content = text?.trim()
  if (!content || (key && seenTranscripts.has(key))) return
  if (key) seenTranscripts.add(key)
  transcript.push({ role, text: content })
  if (!showInLog) return
  const log = document.getElementById('captionOverlay')
  if (!log) return
  log.textContent = `${role === 'assistant' ? 'Spencer' : 'You'}: ${content}`
}

const show = id => {
  ;['jobs', 'application', 'interview', 'complete'].forEach(v => {
    document.getElementById(v).classList.toggle('hidden', v !== id)
  })
}

const renderTranscriptPreview = () => {
  const transcriptDiv = document.getElementById('transcript')
  if (!transcriptDiv) return
  transcriptDiv.innerHTML = ''
  const h2 = document.createElement('h2')
  h2.textContent = 'Transcript'
  transcriptDiv.appendChild(h2)
  const list = document.createElement('div')
  list.className = 'transcript-entries'
  if (!transcript.length) {
    const empty = document.createElement('p')
    empty.textContent = 'No transcript captured.'
    list.appendChild(empty)
  } else {
    transcript.forEach(item => {
      const row = document.createElement('p')
      row.className = `transcript-line ${item.role}`
      row.textContent = `${item.role === 'assistant' ? 'Spencer' : 'You'}: ${item.text}`
      list.appendChild(row)
    })
  }
  transcriptDiv.appendChild(list)
}

const renderJobs = () => {
  const container = document.getElementById('jobList')
  jobs.forEach(job => {
    const card = document.createElement('div')
    card.className = 'job-card'

    const title = document.createElement('h2')
    title.textContent = job.title

    const dept = document.createElement('p')
    dept.textContent = job.department

    const btn = document.createElement('button')
    btn.textContent = 'Apply'
    btn.onclick = () => showApplication(job)

    card.appendChild(title)
    card.appendChild(dept)
    card.appendChild(btn)
    container.appendChild(card)
  })
}

const showApplication = job => {
  currentJob = job
  document.getElementById('jobTitle').textContent = job.title
  show('application')
}

document.getElementById('applicationForm').onsubmit = async e => {
  e.preventDefault()
  currentCandidate = {
    id: Date.now(),
    job: currentJob,
    linkedin: document.getElementById('linkedin').value,
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    timestamp: new Date().toISOString(),
  }

  const resumeFile = document.getElementById('resume').files[0]
  if (resumeFile) {
    currentCandidate.resume = resumeFile.name
  }

  await startInterview()
}

const startInterview = async () => {
  show('interview')
  transcript = []
  currentQuestionText = ''
  seenTranscripts.clear()
  analysisGenerated = false
  const captions = document.getElementById('captionOverlay')
  if (captions) captions.textContent = ''

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  document.getElementById('userVideo').srcObject = stream

  pc = new RTCPeerConnection()

  const audioElement = document.createElement('audio')
  audioElement.autoplay = true
  audioElement.volume = 1
  audioElement.setAttribute('playsinline', true)
  pc.ontrack = e => (audioElement.srcObject = e.streams[0])

  pc.addTrack(stream.getAudioTracks()[0])

  dc = pc.createDataChannel('oai-events')

  dc.addEventListener('open', () => {
    dc.send(
      JSON.stringify({
        session: {
          audio: {
            input: {
              transcription: {
                language: 'en',
                model: 'gpt-4o-transcribe',
              },
              turn_detection: {
                create_response: true,
                eagerness: 'low',
                interrupt_response: false,
                type: 'semantic_vad',
              },
            },
          },
          type: 'realtime',
        },
        type: 'session.update',
      }),
    )
  })

  dc.addEventListener('message', e => {
    const event = JSON.parse(e.data)
    if (event.type === 'error') {
      console.error('Realtime error:', event.error?.message || event)
      return
    }
    handleInterviewEvent(event)
  })

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const sessionConfig = {
    audio: {
      input: {
        transcription: {
          language: 'en',
          model: 'gpt-4o-transcribe',
        },
        turn_detection: {
          create_response: true,
          eagerness: 'low',
          interrupt_response: false,
          type: 'semantic_vad',
        },
      },
      output: {
        voice: 'echo',
      },
    },
    instructions: `You are Spencer, a warm and professional AI interview assistant.

INTRODUCTION (spend about 20 seconds):
Start by welcoming the candidate warmly. Introduce yourself as Spencer and let them know you'll be conducting their interview today. Explain that this will be a conversational interview where you'll ask them questions about their background and experience. Let them know it should take about 10 minutes. Put them at ease with a friendly, professional tone. Finish the introduction by asking if they're comfortable and ready to begin.

INTERVIEW PROCESS:
After your introduction, conduct the interview by asking these 10 questions, one at a time:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

IMPORTANT: Wait patiently for the candidate to fully answer each question. Do not interrupt. Let them finish speaking completely before you respond or move to the next question. If there is a pause, wait a few extra seconds to make sure they are done speaking.

CLOSING:
After asking all 10 questions, thank the candidate warmly for their time and let them know the interview is complete. Wish them well.`,
    model: 'gpt-realtime',
    type: 'realtime',
  }

  const sdpResponse = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-webrtc', {
    body: JSON.stringify({ sdp: offer.sdp, session: sessionConfig }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!sdpResponse.ok) {
    const errorText = await sdpResponse.text()
    console.error('WebRTC setup failed:', errorText)
    alert(`Failed to start interview: ${errorText}`)
    return
  }

  const sdpText = await sdpResponse.text()
  const answer = { sdp: sdpText, type: 'answer' }
  await pc.setRemoteDescription(answer)

  updateMainDisplay('Welcome!\n\nSpeak at any time to begin.')
  startTime = Date.now()
  updateTimer()
}

const extractQuestion = text => {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const lastQuestion = sentences.reverse().find(s => s.includes('?'))
  if (lastQuestion) return lastQuestion.trim()

  const allSentences = text.split(/[.!?]+/).filter(s => s.trim())
  return allSentences.pop()?.trim() || text
}

const handleInterviewEvent = event => {
  if (event.type === 'response.output_audio_transcript.delta') {
    currentQuestionText += event.delta
  } else if (event.type === 'response.output_audio_transcript.done') {
    const textToSave = extractQuestion(currentQuestionText)
    if (textToSave) {
      recordTranscript('assistant', textToSave, null, false)
      updateMainDisplay(textToSave)
    }
    currentQuestionText = ''
  } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
    recordTranscript('user', event.transcript, event.item_id)
  } else if (event.type === 'conversation.item.created' || event.type === 'conversation.item.done') {
    if (event.item?.role === 'user') {
      const content = event.item.content?.find(c => c.type === 'input_audio')
      if (content) {
        if (content.transcript) recordTranscript('user', content.transcript, event.item?.id)
      }
    }
  }
}

const updateMainDisplay = text => {
  const mainEl = document.getElementById('mainCopy')
  if (mainEl) mainEl.textContent = text || 'Listening...'
}

const updateTimer = () => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const remaining = 600 - elapsed

  if (remaining <= 0) {
    endInterview()
    return
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`

  setTimeout(updateTimer, 1000)
}

const endInterview = async () => {
  if (pc) pc.close()
  if (dc) dc.close()

  document
    .getElementById('userVideo')
    .srcObject.getTracks()
    .forEach(t => t.stop())

  const candidates = JSON.parse(localStorage.getItem('candidates') || '[]')
  currentCandidate.transcript = transcript
  candidates.unshift(currentCandidate)
  localStorage.setItem('candidates', JSON.stringify(candidates))

  show('complete')

  renderTranscriptPreview()
  const followupDiv = document.getElementById('followup')
  if (followupDiv) followupDiv.innerHTML = ''
  const loading = document.createElement('p')
  loading.textContent = 'Generating analysis...'
  loading.style.fontStyle = 'italic'
  loading.style.color = '#666'
  ;(followupDiv || document.getElementById('transcript')).appendChild(loading)

  await generateAnalysis()
  loading.remove()
}

const generateAnalysis = async () => {
  if (analysisGenerated) return
  if (!transcript.length) {
    console.error('No transcript available')
    const loading = document.querySelector('#transcript p')
    if (loading) loading.textContent = 'No transcript recorded. Please try the interview again.'
    return
  }
  analysisGenerated = true

  const transcriptText = transcript.map(t => `${t.role}: ${t.text}`).join('\n')

  const requestBody = {
    input: `Interview transcript:\n${transcriptText}`,
    instructions: `Analyze this job interview transcript and generate:
1. 10 follow-up questions tailored to this candidate that uniquely empower the hiring manager to dig deeper
2. Highlight the top 3 questions the hiring manager should ask in the next round to reduce risk for the company

Be specific and relevant to what was discussed.`,
    model: 'gpt-4.1',
    text: {
      format: {
        name: 'interview_analysis',
        schema: {
          additionalProperties: false,
          properties: {
            followup_questions: {
              items: {
                additionalProperties: false,
                properties: {
                  highlighted: { type: 'boolean' },
                  question: { type: 'string' },
                },
                required: ['question', 'highlighted'],
                type: 'object',
              },
              maxItems: 10,
              minItems: 10,
              type: 'array',
            },
          },
          required: ['followup_questions'],
          type: 'object',
        },
        strict: true,
        type: 'json_schema',
      },
    },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  const result = await response.json()
  const analysis = JSON.parse(result.output_text)

  currentCandidate.analysis = analysis

  const candidates = JSON.parse(localStorage.getItem('candidates') || '[]')
  candidates[0] = currentCandidate
  localStorage.setItem('candidates', JSON.stringify(candidates))

  renderAnalysis(analysis)
}

const renderAnalysis = analysis => {
  renderTranscriptPreview()

  const followupDiv = document.getElementById('followup')
  if (!followupDiv) return
  followupDiv.innerHTML = ''
  const h2b = document.createElement('h2')
  h2b.textContent = 'Follow-up Questions'
  followupDiv.appendChild(h2b)

  const ol = document.createElement('ol')
  analysis.followup_questions.forEach(q => {
    const li = document.createElement('li')
    li.textContent = q.question
    if (q.highlighted) li.className = 'highlighted'
    ol.appendChild(li)
  })
  followupDiv.appendChild(ol)
}

renderJobs()
const inviteButton = document.getElementById('inviteButton')
if (inviteButton) inviteButton.onclick = () => alert('Must have PRO account')
