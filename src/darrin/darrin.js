const API_ENDPOINT = 'https://us-central1-samantha-374622.cloudfunctions.net/openai-4'

const BASE_PROMPT = `You are Darrin, an outbound cold sales expert helping bootstrapped solo-founders develop their differentiator, messaging, and sales process.

Your approach:
- Ask probing questions that force deeper thinking about their business
- Challenge vague or generic statements
- Push founders to be more specific and concrete
- Help strengthen messaging to resonate with target audiences
- Guide them through a proven framework for promotional campaigns

When analyzing answers:
- Grade each response (A-F) based on specificity, clarity, and market resonance
- Identify weaknesses and generic statements
- Provide specific feedback on how to improve
- Ask follow-up questions to uncover deeper insights
- Help refine answers to be more compelling and differentiated`

let courseQuestions = []
const keyMap = new Map()

const generateKey = (question, index) => {
  let key = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60)

  // Ensure uniqueness by appending index if key already exists
  if (keyMap.has(key)) {
    key = `${key}_${index}`
  }
  keyMap.set(key, true)
  return key
}

const loadCourse = async () => {
  const response = await fetch('course.json')
  const course = await response.json()
  const questions = []

  course.sessions.forEach(session => {
    session.modules.forEach(module => {
      module.groups?.forEach(group => {
        group.questions?.forEach(question => {
          questions.push({ module: module.title, question, session: session.title })
        })
      })
    })
  })

  return questions
}

const getAnswersFormat = questions => {
  const properties = {}
  keyMap.clear()

  questions.forEach(({ question }, index) => {
    const key = generateKey(question, index)
    properties[key] = { type: 'string' }
  })

  keyMap.clear()
  const required = questions.map(({ question }, index) => generateKey(question, index))

  return {
    type: 'json_schema',
    json_schema: {
      name: 'course_answers',
      schema: {
        additionalProperties: false,
        properties,
        required,
        type: 'object',
      },
    },
  }
}

const getFeedbackFormat = (questions, answers) => {
  const properties = {}
  keyMap.clear()

  questions.forEach(({ question }, index) => {
    const key = generateKey(question, index)
    properties[key] = {
      type: 'object',
      properties: {
        answer: { type: 'string', description: answers[key] },
        feedback: { type: 'string' },
        grade: { type: 'string' },
      },
      required: ['answer', 'feedback', 'grade'],
    }
  })

  keyMap.clear()
  const required = questions.map(({ question }, index) => generateKey(question, index))

  return {
    type: 'json_schema',
    json_schema: {
      name: 'course_feedback',
      schema: {
        additionalProperties: false,
        properties,
        required,
        type: 'object',
      },
    },
  }
}

const generateAnswers = async input => {
  const startTime = Date.now()
  const messages = [
    { role: 'system', content: BASE_PROMPT },
    {
      role: 'user',
      content: `Based on the following information, generate concise initial answers to these questions:

Questions:
${courseQuestions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Information:
${input}`,
    },
  ]

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      response_format: getAnswersFormat(courseQuestions),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response body:', errorText)
    throw new Error(`API request failed: ${response.status}`)
  }

  const completion = await response.json()
  const duration = Math.round((Date.now() - startTime) / 1000)
  return {
    answers: JSON.parse(completion.choices[0].message.content),
    duration,
    tokens: completion.usage,
  }
}

const generateFeedback = async answers => {
  const startTime = Date.now()
  const messages = [
    { role: 'system', content: BASE_PROMPT },
    {
      role: 'user',
      content: 'Review the provided answers and give each a grade (A-F) and specific feedback on how to strengthen it.',
    },
  ]

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      response_format: getFeedbackFormat(courseQuestions, answers),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response body:', errorText)
    throw new Error(`API request failed: ${response.status}`)
  }

  const completion = await response.json()
  const duration = Math.round((Date.now() - startTime) / 1000)
  return {
    duration,
    feedback: JSON.parse(completion.choices[0].message.content),
    tokens: completion.usage,
  }
}

const renderResults = (answers, feedback = null) => {
  const resultsEl = document.getElementById('results')
  let currentSession = ''
  let currentModule = ''

  keyMap.clear()
  courseQuestions.forEach(({ module, question, session }, index) => {
    if (session !== currentSession) {
      const h2 = document.createElement('h2')
      h2.className = 'session-title'
      h2.textContent = session
      resultsEl.appendChild(h2)
      currentSession = session
      currentModule = ''
    }
    if (module !== currentModule) {
      const h3 = document.createElement('h3')
      h3.className = 'module-title'
      h3.textContent = module
      resultsEl.appendChild(h3)
      currentModule = module
    }

    const key = generateKey(question, index)
    const answer = answers[key]
    const fb = feedback ? feedback[key] : null

    const questionDiv = document.createElement('div')
    questionDiv.className = 'question'

    const h4 = document.createElement('h4')
    h4.textContent = question
    if (fb) {
      const grade = document.createElement('span')
      grade.className = 'grade'
      grade.textContent = fb.grade
      h4.appendChild(document.createTextNode(' '))
      h4.appendChild(grade)
    }
    questionDiv.appendChild(h4)

    const answerDiv = document.createElement('div')
    answerDiv.className = 'answer'
    answerDiv.textContent = answer
    questionDiv.appendChild(answerDiv)

    const feedbackDiv = document.createElement('div')
    feedbackDiv.className = 'feedback'
    if (fb) {
      feedbackDiv.textContent = fb.feedback
    } else {
      feedbackDiv.className = 'feedback loading'
      feedbackDiv.textContent = 'Analyzing answer...'
    }
    questionDiv.appendChild(feedbackDiv)

    resultsEl.appendChild(questionDiv)
  })
}

const countWords = text => text.trim().split(/\s+/).length

const saveToLocalStorage = (input, answersData, feedbackData) => {
  const runs = JSON.parse(localStorage.getItem('darrin') || '[]')
  const output = []

  keyMap.clear()
  courseQuestions.forEach(({ question }, index) => {
    const key = generateKey(question, index)
    output.push({
      answer: answersData.answers[key],
      feedback: feedbackData.feedback[key].feedback,
      grade: feedbackData.feedback[key].grade,
      question,
    })
  })

  const totalWords = output.reduce((sum, { answer, feedback }) => sum + countWords(answer) + countWords(feedback), 0)

  runs.push({
    created: Date.now(),
    input,
    output,
    seconds: answersData.duration + feedbackData.duration,
    tokens: {
      answers: answersData.tokens,
      feedback: feedbackData.tokens,
      total: answersData.tokens.total_tokens + feedbackData.tokens.total_tokens,
    },
    words: totalWords,
  })

  localStorage.setItem('darrin', JSON.stringify(runs))
  renderHistory()
}

const loadFromLocalStorage = index => {
  const runs = JSON.parse(localStorage.getItem('darrin') || '[]')
  const run = runs[index]
  if (!run) return

  document.getElementById('input').value = run.input

  const resultsEl = document.getElementById('results')
  resultsEl.textContent = ''
  let currentSession = ''
  let currentModule = ''

  run.output.forEach(({ answer, feedback, grade, question }) => {
    const questionData = courseQuestions.find(q => q.question === question)
    if (!questionData) return

    if (questionData.session !== currentSession) {
      const h2 = document.createElement('h2')
      h2.className = 'session-title'
      h2.textContent = questionData.session
      resultsEl.appendChild(h2)
      currentSession = questionData.session
      currentModule = ''
    }
    if (questionData.module !== currentModule) {
      const h3 = document.createElement('h3')
      h3.className = 'module-title'
      h3.textContent = questionData.module
      resultsEl.appendChild(h3)
      currentModule = questionData.module
    }

    const questionDiv = document.createElement('div')
    questionDiv.className = 'question'

    const h4 = document.createElement('h4')
    h4.textContent = question
    const gradeSpan = document.createElement('span')
    gradeSpan.className = 'grade'
    gradeSpan.textContent = grade
    h4.appendChild(document.createTextNode(' '))
    h4.appendChild(gradeSpan)
    questionDiv.appendChild(h4)

    const answerDiv = document.createElement('div')
    answerDiv.className = 'answer'
    answerDiv.textContent = answer
    questionDiv.appendChild(answerDiv)

    const feedbackDiv = document.createElement('div')
    feedbackDiv.className = 'feedback'
    feedbackDiv.textContent = feedback
    questionDiv.appendChild(feedbackDiv)

    resultsEl.appendChild(questionDiv)
  })
}

const renderHistory = () => {
  const runs = JSON.parse(localStorage.getItem('darrin') || '[]')
  const historyEl = document.getElementById('history')

  historyEl.textContent = ''

  if (runs.length === 0) return

  const h2 = document.createElement('h2')
  h2.textContent = 'Previous Runs'
  historyEl.appendChild(h2)

  const list = document.createElement('div')
  list.className = 'history-list'

  runs
    .slice()
    .reverse()
    .forEach((run, i) => {
      const btn = document.createElement('button')
      btn.className = 'history-item'
      btn.dataset.index = i

      const preview = document.createElement('span')
      preview.className = 'history-preview'
      preview.textContent = run.input.substring(0, 100) + (run.input.length > 100 ? '...' : '')
      btn.appendChild(preview)

      if (run.seconds && run.tokens && run.words) {
        const stats = document.createElement('div')
        stats.className = 'history-stats'

        const seconds = document.createElement('span')
        seconds.textContent = `${run.seconds}s`
        stats.appendChild(seconds)

        const tokens = document.createElement('span')
        tokens.textContent = `${run.tokens.total}t`
        stats.appendChild(tokens)

        const words = document.createElement('span')
        words.textContent = `${run.words}w`
        stats.appendChild(words)

        btn.appendChild(stats)
      }

      btn.addEventListener('click', () => {
        const index = runs.length - 1 - parseInt(btn.dataset.index)
        loadFromLocalStorage(index)
      })

      list.appendChild(btn)
    })

  historyEl.appendChild(list)
}

document.getElementById('submit').addEventListener('click', async () => {
  const input = document.getElementById('input').value.trim()
  const btn = document.getElementById('submit')
  const resultsEl = document.getElementById('results')

  if (!input) {
    alert('Please enter some information')
    return
  }

  btn.disabled = true
  resultsEl.textContent = ''

  const step1Msg = document.createElement('div')
  step1Msg.className = 'loading'
  step1Msg.textContent = 'Step 1/2: Generating answers for all 74 questions...'
  resultsEl.appendChild(step1Msg)

  try {
    const answersData = await generateAnswers(input)
    renderResults(answersData.answers)

    const step1Complete = document.createElement('div')
    step1Complete.className = 'loading'
    step1Complete.textContent = `Step 1 complete: ${answersData.duration}s, ${answersData.tokens.total_tokens} tokens`
    resultsEl.insertBefore(step1Complete, resultsEl.firstChild)

    const step2Msg = document.createElement('div')
    step2Msg.className = 'loading'
    step2Msg.textContent = 'Step 2/2: Grading and providing feedback...'
    resultsEl.insertBefore(step2Msg, resultsEl.firstChild)

    const feedbackData = await generateFeedback(answersData.answers)
    renderResults(answersData.answers, feedbackData.feedback)

    const totalSeconds = answersData.duration + feedbackData.duration
    const totalTokens = answersData.tokens.total_tokens + feedbackData.tokens.total_tokens

    const completeMsg = document.createElement('div')
    completeMsg.className = 'loading'
    completeMsg.textContent = `Complete: ${totalSeconds}s total, ${totalTokens} tokens total`
    resultsEl.insertBefore(completeMsg, resultsEl.firstChild)

    saveToLocalStorage(input, answersData, feedbackData)
  } catch (err) {
    resultsEl.textContent = ''
    const errorMsg = document.createElement('div')
    errorMsg.className = 'loading'
    errorMsg.textContent = `Error: ${err.message}`
    resultsEl.appendChild(errorMsg)
  } finally {
    btn.disabled = false
  }
})

loadCourse().then(questions => {
  courseQuestions = questions
  console.log(`Loaded ${questions.length} questions`)
  renderHistory()
})
