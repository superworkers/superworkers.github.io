let courseData = null
let courseModules = []
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
  const modules = []

  course.sessions.forEach(session => {
    session.modules.forEach(module => {
      const questions = []
      module.groups?.forEach(group => {
        group.questions?.forEach(question => {
          questions.push({ module: module.title, question, session: session.title })
        })
      })
      if (questions.length > 0) {
        modules.push({ module: module.title, questions, session: session.title })
      }
    })
  })

  return { course, modules }
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
    name: 'course_answers',
    schema: {
      additionalProperties: false,
      properties,
      required,
      type: 'object',
    },
    strict: true,
    type: 'json_schema',
  }
}

const getFeedbackFormat = (questions, answers) => {
  const properties = {}
  keyMap.clear()

  questions.forEach(({ question }, index) => {
    const key = generateKey(question, index)
    properties[key] = {
      additionalProperties: false,
      properties: {
        answer: { type: 'string' },
        feedback: { type: 'string' },
        grade: { type: 'string' },
      },
      required: ['answer', 'feedback', 'grade'],
      type: 'object',
    }
  })

  keyMap.clear()
  const required = questions.map(({ question }, index) => generateKey(question, index))

  return {
    name: 'course_feedback',
    schema: {
      additionalProperties: false,
      properties,
      required,
      type: 'object',
    },
    strict: true,
    type: 'json_schema',
  }
}

const generateModuleAnswers = async (input, moduleQuestions) => {
  const startTime = Date.now()

  const requestBody = {
    input: `Based on the following information, generate concise initial answers to these questions:

Questions:
${moduleQuestions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

Information:
${input}`,
    instructions: `You are Darrin, an outbound cold sales expert helping bootstrapped solo-founders develop their differentiator, messaging, and sales process.

Your approach:
- Ask probing questions that force deeper thinking about their business
- Challenge vague or generic statements
- Push founders to be more specific and concrete
- Help strengthen messaging to resonate with target audiences
- Guide them through a proven framework for promotional campaigns`,
    model: 'gpt-4.1',
    text: {
      format: getAnswersFormat(moduleQuestions),
    },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response body:', errorText)
    throw new Error(`API request failed: ${response.status}`)
  }

  const result = await response.json()
  const duration = Math.round((Date.now() - startTime) / 1000)
  return {
    answers: JSON.parse(result.output_text),
    duration,
    tokens: result.usage,
  }
}

const generateModuleFeedback = async (moduleQuestions, moduleAnswers) => {
  const startTime = Date.now()

  keyMap.clear()
  const answersText = moduleQuestions
    .map(({ question }, index) => {
      const key = generateKey(question, index)
      return `Q: ${question}\nA: ${moduleAnswers[key]}`
    })
    .join('\n\n')

  const requestBody = {
    input: `Review the provided answers and give each a grade (A-F) and specific feedback on how to strengthen it.

${answersText}`,
    instructions: `You are Darrin, an outbound cold sales expert helping bootstrapped solo-founders develop their differentiator, messaging, and sales process.

When analyzing answers:
- Grade each response (A-F) based on specificity, clarity, and market resonance
- Identify weaknesses and generic statements
- Provide specific feedback on how to improve
- Ask follow-up questions to uncover deeper insights
- Help refine answers to be more compelling and differentiated`,
    model: 'gpt-4.1',
    text: {
      format: getFeedbackFormat(moduleQuestions, moduleAnswers),
    },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response body:', errorText)
    throw new Error(`API request failed: ${response.status}`)
  }

  const result = await response.json()
  const duration = Math.round((Date.now() - startTime) / 1000)
  return {
    duration,
    feedback: JSON.parse(result.output_text),
    tokens: result.usage,
  }
}

const getAllQuestions = () => {
  const questions = []
  courseModules.forEach(({ questions: moduleQuestions }) => {
    questions.push(...moduleQuestions)
  })
  return questions
}

const renderResults = (answers, feedback = null) => {
  const resultsEl = document.getElementById('results')
  const statusMessage = resultsEl.querySelector('.loading:not(.feedback)')

  resultsEl.textContent = ''
  if (statusMessage) resultsEl.appendChild(statusMessage)

  let currentSession = ''
  let currentModule = ''

  keyMap.clear()
  getAllQuestions().forEach(({ module, question, session }, index) => {
    const key = generateKey(question, index)
    const answer = answers[key]
    if (!answer) return

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

    if (feedback !== null) {
      const feedbackDiv = document.createElement('div')
      feedbackDiv.className = 'feedback'
      if (fb) {
        feedbackDiv.textContent = fb.feedback
      } else {
        feedbackDiv.className = 'feedback loading'
        feedbackDiv.textContent = 'Analyzing answer...'
      }
      questionDiv.appendChild(feedbackDiv)
    }

    resultsEl.appendChild(questionDiv)
  })
}

const countWords = text => text.trim().split(/\s+/).length

const saveToLocalStorage = (input, allAnswers, allFeedback, totalDuration, totalTokens, isInProgress = false) => {
  const runs = JSON.parse(localStorage.getItem('darrin') || '[]')

  if (isInProgress) {
    if (runs.length > 0 && runs[0].inProgress) {
      const output = []
      keyMap.clear()
      getAllQuestions().forEach(({ question }, index) => {
        const key = generateKey(question, index)
        if (allAnswers[key]) {
          output.push({
            answer: allAnswers[key],
            feedback: allFeedback[key]?.feedback || '',
            grade: allFeedback[key]?.grade || '',
            question,
          })
        }
      })
      const totalWords = output.reduce(
        (sum, { answer, feedback }) => sum + countWords(answer) + countWords(feedback),
        0,
      )
      runs[0] = {
        created: runs[0].created,
        inProgress: true,
        input,
        output,
        seconds: totalDuration,
        tokens: { total: totalTokens },
        words: totalWords,
      }
    } else {
      runs.unshift({ created: Date.now(), inProgress: true, input, output: [], seconds: 0, tokens: 0, words: 0 })
    }
  } else {
    const output = []
    keyMap.clear()
    getAllQuestions().forEach(({ question }, index) => {
      const key = generateKey(question, index)
      if (allAnswers[key] && allFeedback[key]) {
        output.push({
          answer: allAnswers[key],
          feedback: allFeedback[key].feedback,
          grade: allFeedback[key].grade,
          question,
        })
      }
    })
    const totalWords = output.reduce((sum, { answer, feedback }) => sum + countWords(answer) + countWords(feedback), 0)

    if (runs.length > 0 && runs[0].inProgress) {
      runs[0] = {
        created: runs[0].created,
        input,
        output,
        seconds: totalDuration,
        tokens: { total: totalTokens },
        words: totalWords,
      }
    } else {
      runs.unshift({
        created: Date.now(),
        input,
        output,
        seconds: totalDuration,
        tokens: { total: totalTokens },
        words: totalWords,
      })
    }
  }

  localStorage.setItem('darrin', JSON.stringify(runs.slice(0, 10)))
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
    const questionData = getAllQuestions().find(q => q.question === question)
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
        tokens.textContent = `${run.tokens.total.toLocaleString()}t`
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

document.getElementById('generate-interview').addEventListener('click', async () => {
  const btn = document.getElementById('generate-interview')
  const textarea = document.getElementById('input')

  btn.disabled = true
  btn.textContent = 'Generating interview...'

  try {
    const requestBody = {
      input: `Come up with a new business idea and pretend you are its bootstrapped solopreneur being interviewed by a sales strategist who wants to help you develop your messaging and promotional campaigns.

Speak for several minutes to provide as much context about:
- Your business and what you do
- Who you are solving for
- Their pains and needs
- Why it excites you
- Why you started doing it
- What's been painful
- Your growth goals
- A couple short recent stories about success and failure

Make it realistic, specific, and detailed like an actual conversation.`,
      instructions:
        'You are a bootstrapped solopreneur founder being interviewed about your business. Speak naturally and provide detailed, specific context.',
      model: 'gpt-4.1',
    }

    const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      throw new Error(`API request failed: ${response.status}`)
    }

    const result = await response.json()
    textarea.value = result.output_text
  } catch (err) {
    alert(`Error: ${err.message}`)
  } finally {
    btn.disabled = false
    btn.textContent = 'Generate test interview'
  }
})

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

  let allAnswers = {}
  let allFeedback = {}
  let totalDuration = 0
  let totalTokens = { total_tokens: 0 }

  saveToLocalStorage(input, {}, {}, 0, 0, true)

  try {
    let statusMsg = document.createElement('div')
    statusMsg.className = 'loading'
    resultsEl.appendChild(statusMsg)

    // Phase 1: Generate answers module by module
    for (let i = 0; i < courseModules.length; i++) {
      const { module, questions } = courseModules[i]

      statusMsg.textContent = `Generating answers for ${module} (${i + 1}/${courseModules.length})...`

      const { answers, duration, tokens } = await generateModuleAnswers(input, questions)
      allAnswers = { ...allAnswers, ...answers }
      totalDuration += duration
      totalTokens.total_tokens += tokens.total_tokens

      renderResults(allAnswers, null)
      saveToLocalStorage(input, allAnswers, allFeedback, totalDuration, totalTokens.total_tokens, true)
    }

    // Phase 2: Generate feedback module by module
    for (let i = 0; i < courseModules.length; i++) {
      const { module, questions } = courseModules[i]

      statusMsg.textContent = `Grading ${module} (${i + 1}/${courseModules.length})...`

      // Only show feedback UI starting from first feedback request
      if (i === 0) {
        renderResults(allAnswers, {})
      }

      const moduleAnswers = {}
      const allQuestions = getAllQuestions()
      questions.forEach(q => {
        const qIndex = allQuestions.findIndex(aq => aq.question === q.question)
        keyMap.clear()
        const key = generateKey(q.question, qIndex)
        moduleAnswers[key] = allAnswers[key]
      })

      const { feedback, duration, tokens } = await generateModuleFeedback(questions, moduleAnswers)
      allFeedback = { ...allFeedback, ...feedback }
      totalDuration += duration
      totalTokens.total_tokens += tokens.total_tokens

      renderResults(allAnswers, allFeedback)
      saveToLocalStorage(input, allAnswers, allFeedback, totalDuration, totalTokens.total_tokens, true)
    }

    statusMsg.textContent = `Complete: ${totalDuration}s, ${totalTokens.total_tokens.toLocaleString()} tokens`

    saveToLocalStorage(input, allAnswers, allFeedback, totalDuration, totalTokens.total_tokens, false)
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

loadCourse().then(({ course, modules }) => {
  courseData = course
  courseModules = modules
  renderHistory()
})
