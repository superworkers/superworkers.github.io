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

let currentView = 'list'
const storedQuestions = localStorage.getItem('questions')
let questions = storedQuestions ? JSON.parse(storedQuestions) : [...defaultQuestions]
if (!storedQuestions) localStorage.setItem('questions', JSON.stringify(questions))

const showTab = tab => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('candidates').classList.toggle('hidden', tab !== 'candidates')
  document.getElementById('questions').classList.toggle('hidden', tab !== 'questions')

  if (tab === 'candidates') {
    renderCandidates()
  } else {
    renderQuestions()
  }
}

const renderCandidates = () => {
  const candidates = JSON.parse(localStorage.getItem('candidates') || '[]')
  const container = document.getElementById('candidateList')
  container.innerHTML = ''

  if (candidates.length === 0) {
    const p = document.createElement('p')
    p.textContent = 'No interviews yet'
    container.appendChild(p)
    return
  }

  candidates.forEach(candidate => {
    const card = document.createElement('div')
    card.className = 'candidate-card'
    card.onclick = () => showCandidateDetail(candidate)

    const name = document.createElement('h3')
    name.textContent = candidate.name

    const email = document.createElement('p')
    email.textContent = candidate.email

    const job = document.createElement('p')
    job.textContent = `Applied for: ${candidate.job.title}`

    const date = document.createElement('p')
    date.textContent = new Date(candidate.timestamp).toLocaleString()

    card.appendChild(name)
    card.appendChild(email)
    card.appendChild(job)
    card.appendChild(date)
    container.appendChild(card)
  })
}

const showCandidateDetail = candidate => {
  currentView = 'detail'
  document.getElementById('candidateList').classList.add('hidden')
  document.getElementById('candidateDetail').classList.remove('hidden')

  const container = document.getElementById('detailContent')
  container.innerHTML = ''

  const info = document.createElement('div')
  info.className = 'detail-section'
  const h2 = document.createElement('h2')
  h2.textContent = 'Candidate Information'
  info.appendChild(h2)

  const fields = [
    ['Name', candidate.name],
    ['Email', candidate.email],
    ['LinkedIn', candidate.linkedin || 'Not provided'],
    ['Resume', candidate.resume || 'Not provided'],
    ['Position', candidate.job.title],
    ['Date', new Date(candidate.timestamp).toLocaleString()],
  ]

  fields.forEach(([label, value]) => {
    const p = document.createElement('p')
    const strong = document.createElement('strong')
    strong.textContent = `${label}: `
    p.appendChild(strong)
    p.appendChild(document.createTextNode(value))
    info.appendChild(p)
  })

  container.appendChild(info)

  if (candidate.analysis) {
    const transcript = document.createElement('div')
    transcript.className = 'detail-section'
    const h2t = document.createElement('h2')
    h2t.textContent = 'Interview Transcript'
    transcript.appendChild(h2t)

    const list = document.createElement('div')
    list.className = 'transcript-entries'
    candidate.transcript?.forEach(item => {
      const row = document.createElement('p')
      row.className = `transcript-line ${item.role}`
      row.textContent = `${item.role === 'assistant' ? 'Spencer' : 'Candidate'}: ${item.text}`
      list.appendChild(row)
    })
    if (!list.childNodes.length) {
      const empty = document.createElement('p')
      empty.textContent = 'Transcript unavailable.'
      list.appendChild(empty)
    }
    transcript.appendChild(list)
    container.appendChild(transcript)

    const followup = document.createElement('div')
    followup.className = 'detail-section'
    const h2f = document.createElement('h2')
    h2f.textContent = 'Follow-up Questions'
    followup.appendChild(h2f)

    const ol = document.createElement('ol')
    candidate.analysis.followup_questions.forEach(q => {
      const li = document.createElement('li')
      li.textContent = q.question
      if (q.highlighted) li.className = 'highlighted'
      ol.appendChild(li)
    })
    followup.appendChild(ol)
    container.appendChild(followup)
  }
}

const backToList = () => {
  currentView = 'list'
  document.getElementById('candidateList').classList.remove('hidden')
  document.getElementById('candidateDetail').classList.add('hidden')
}

const renderQuestions = () => {
  const container = document.getElementById('questionList')
  container.innerHTML = ''

  questions.forEach((q, i) => {
    const div = document.createElement('div')
    div.className = 'question-item'

    const input = document.createElement('input')
    input.value = q
    input.dataset.index = i

    const deleteBtn = document.createElement('button')
    deleteBtn.textContent = 'Delete'
    deleteBtn.onclick = () => deleteQuestion(i)

    div.appendChild(input)
    div.appendChild(deleteBtn)
    container.appendChild(div)
  })
}

const addQuestion = () => {
  questions.push('')
  renderQuestions()
}

const deleteQuestion = index => {
  questions.splice(index, 1)
  renderQuestions()
}

const saveQuestions = () => {
  const inputs = document.querySelectorAll('.question-item input')
  questions = Array.from(inputs)
    .map(input => input.value)
    .filter(q => q.trim())
  localStorage.setItem('questions', JSON.stringify(questions))
  alert('Questions saved!')
}

const resetAdmin = () => {
  localStorage.removeItem('candidates')
  localStorage.removeItem('questions')
  questions = [...defaultQuestions]
  localStorage.setItem('questions', JSON.stringify(questions))
  renderQuestions()
  renderCandidates()
  backToList()
  alert('Admin data reset.')
}

renderCandidates()
