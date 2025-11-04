let checklistData = []
let exampleSermon = ''

const loadChecklist = async () => {
  const response = await fetch('checklist.json')
  const data = await response.json()
  return data.categories
}

const flattenChecklist = categories => {
  const items = []
  categories.forEach(category => {
    if (category.sections) {
      category.sections.forEach(section => {
        section.items.forEach(item => {
          items.push({ category: category.title, section: section.title, item })
        })
      })
    } else if (category.items) {
      category.items.forEach(item => {
        items.push({ category: category.title, item })
      })
    }
  })
  return items
}

const getAnalysisFormat = items => ({
  name: 'sermon_audit',
  schema: {
    additionalProperties: false,
    properties: {
      checks: {
        items: {
          additionalProperties: false,
          properties: {
            check: {
              enum: items.map(i => i.item.split(' – ')[0]),
              type: 'string',
            },
            excerpts: {
              description: 'Up to 3 short verbatim excerpts relevant to the check word or phrase; empty if none',
              items: {
                type: 'string',
              },
              maxItems: 3,
              type: 'array',
            },
          },
          required: ['check', 'excerpts'],
          type: 'object',
        },
        maxItems: items.length,
        minItems: items.length,
        type: 'array',
      },
    },
    required: ['checks'],
    type: 'object',
  },
  strict: true,
  type: 'json_schema',
})

const analyzeCategory = async (transcript, category, startIndex) => {
  const startTime = Date.now()
  const items = flattenChecklist([category])

  const prompt = `Transcript:
${transcript}

Additional context:
${items
  .filter(i => i.item.includes(' – '))
  .map(i => `Only match ${i.item.split(' – ')[0]} when ${i.item.split(' – ')[1]}`)
  .join('\n')}`

  const requestBody = {
    input: prompt,
    instructions: `You are a theological expert analyzing sermon transcripts for doctrinal and practical coverage.

Your task is to identify where specific theological concepts, practices, virtues, or sins are substantively addressed in the sermon.

Guidelines for excerpts:
- Only extract text where the preacher is actually teaching, explaining, or applying the specific topic
- The excerpt must clearly demonstrate engagement with that particular theological concept
- Mere mentions, passing references, or tangential statements do not count
- The excerpt should show the preacher deliberately addressing this specific item
- If Additional context is provided, only match when the specific criteria are met
- Be extremely discerning - the connection between the excerpt and the topic must be obvious and direct
- When in doubt, leave the excerpts array empty`,
    model: 'gpt-4.1',
    text: {
      format: getAnalysisFormat(items),
    },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response body:', errorText)
    throw new Error(`API request failed: ${response.status}`)
  }

  const result = await response.json()
  const audit = JSON.parse(result.output_text)

  const results = {}
  audit.checks.forEach((check, index) => {
    results[`item_${startIndex + index}`] = { excerpt: check.excerpts.join(' · ') }
  })

  return {
    results,
    duration: Math.round((Date.now() - startTime) / 1000),
    tokens: result.usage,
  }
}

const analyzeSermon = async (transcript, onProgress) => {
  const mainCategories = [
    'Core Christian Theology',
    'Core Discipleship Practices',
    'Core Christian Virtues',
    'Top Discipleship Topics to Push Back on Secular Culture',
    'Sins',
  ]

  let allResults = {}
  let totalDuration = 0
  let totalTokens = 0
  let currentIndex = 0

  // Create initial in-progress entry
  saveToLocalStorage({}, 0, 0, true)

  for (let i = 0; i < mainCategories.length; i++) {
    const categoryTitle = mainCategories[i]
    const category = checklistData.find(cat => cat.title === categoryTitle)

    if (onProgress) onProgress(`Analyzing ${categoryTitle} (${i + 1}/${mainCategories.length})...`, null)

    const stepStart = Date.now()
    const { results, duration, tokens } = await analyzeCategory(transcript, category, currentIndex)
    const stepDuration = Math.round((Date.now() - stepStart) / 1000)

    allResults = { ...allResults, ...results }
    totalDuration += duration
    totalTokens += tokens.total_tokens

    // Save progress after each category
    saveToLocalStorage(allResults, totalDuration, totalTokens, true)

    if (onProgress) onProgress(`Step ${i + 1}/${mainCategories.length} complete`, allResults)

    const itemCount = flattenChecklist([category]).length
    currentIndex += itemCount
  }

  return {
    results: allResults,
    duration: totalDuration,
    tokens: { total_tokens: totalTokens },
  }
}

const renderResults = results => {
  const resultsEl = document.getElementById('results')
  resultsEl.textContent = ''

  const items = flattenChecklist(checklistData)
  let currentCategory = ''
  let currentSection = ''

  items.forEach((item, index) => {
    const hasResult = results[`item_${index}`] !== undefined
    if (!hasResult) return

    if (item.category !== currentCategory) {
      const categoryTitleEl = document.createElement('h2')
      categoryTitleEl.className = 'category-title'
      categoryTitleEl.textContent = item.category
      resultsEl.appendChild(categoryTitleEl)
      currentCategory = item.category
      currentSection = ''
    }

    if (item.section && item.section !== currentSection) {
      const sectionTitleEl = document.createElement('h3')
      sectionTitleEl.className = 'section-title'
      sectionTitleEl.textContent = item.section
      resultsEl.appendChild(sectionTitleEl)
      currentSection = item.section
    }

    const itemDiv = document.createElement('div')
    itemDiv.className = 'checklist-item'
    const excerpt = results[`item_${index}`]?.excerpt
    const isPresent = excerpt && excerpt.trim() !== ''

    const check = document.createElement('div')
    check.className = 'item-check'
    if (isPresent) {
      check.classList.add('present')
      check.textContent = '✓'
    }
    itemDiv.appendChild(check)

    const textContainer = document.createElement('div')
    textContainer.className = 'item-text-container'
    const text = document.createElement('div')
    text.className = 'item-text'
    text.textContent = item.item
    textContainer.appendChild(text)

    if (isPresent) {
      const excerptEl = document.createElement('div')
      excerptEl.className = 'item-excerpt'
      excerptEl.textContent = excerpt
      textContainer.appendChild(excerptEl)
    }

    itemDiv.appendChild(textContainer)
    resultsEl.appendChild(itemDiv)
  })
}

const saveToLocalStorage = (results, seconds, tokens, isInProgress = false) => {
  const history = JSON.parse(localStorage.getItem('jeremy-history') || '[]')
  if (isInProgress) {
    if (history.length > 0 && history[0].inProgress) {
      // Update existing in-progress entry
      history[0] = { results, seconds, timestamp: history[0].timestamp, tokens, inProgress: true }
    } else {
      // Create new in-progress entry
      history.unshift({ results, seconds, timestamp: Date.now(), tokens, inProgress: true })
    }
  } else {
    // Final save - replace in-progress entry if it exists
    if (history.length > 0 && history[0].inProgress) {
      history[0] = { results, seconds, timestamp: history[0].timestamp, tokens }
    } else {
      history.unshift({ results, seconds, timestamp: Date.now(), tokens })
    }
  }
  localStorage.setItem('jeremy-history', JSON.stringify(history.slice(0, 10)))
}

const loadFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem('jeremy-history') || '[]')
}

const renderHistory = () => {
  const history = loadFromLocalStorage()
  const historyEl = document.getElementById('history')
  historyEl.textContent = ''

  if (history.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'loading'
    empty.textContent = 'No previous audits'
    historyEl.appendChild(empty)
    return
  }

  history.forEach((entry, index) => {
    const item = document.createElement('div')
    item.className = 'history-item'

    const date = new Date(entry.timestamp)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    const label = document.createElement('div')
    label.textContent = `${dateStr} • ${entry.seconds}s • ${entry.tokens.toLocaleString()} tokens`
    item.appendChild(label)

    item.addEventListener('click', () => {
      renderResults(entry.results)
      const stats = document.createElement('div')
      stats.className = 'loading'
      stats.textContent = `Loaded from history: ${entry.seconds}s, ${entry.tokens.toLocaleString()} tokens`
      document.getElementById('results').insertBefore(stats, document.getElementById('results').firstChild)
    })

    historyEl.appendChild(item)
  })
}

document.getElementById('submit').addEventListener('click', async () => {
  const btn = document.getElementById('submit')
  if (btn.classList.contains('disabled')) return
  btn.classList.add('disabled')

  const input = document.getElementById('input').value.trim()
  const statusEl = document.getElementById('status')
  const resultsEl = document.getElementById('results')

  if (!input) {
    alert('Please paste a sermon transcript')
    btn.classList.remove('disabled')
    return
  }

  statusEl.className = 'loading'
  statusEl.textContent = 'Starting analysis...'
  resultsEl.textContent = ''

  const startTime = Date.now()
  const originalBtnText = btn.textContent
  let timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    btn.textContent = `Analyzing sermon ${elapsed}s`
  }, 250)

  try {
    const { results, duration, tokens } = await analyzeSermon(input, (message, partialResults) => {
      statusEl.textContent = message
      if (partialResults) renderResults(partialResults)
    })

    renderResults(results)
    statusEl.textContent = `Analysis complete: ${duration}s, ${tokens.total_tokens.toLocaleString()} tokens`

    saveToLocalStorage(results, duration, tokens.total_tokens)
    renderHistory()
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`
    resultsEl.textContent = ''
  } finally {
    clearInterval(timerInterval)
    btn.textContent = originalBtnText
    btn.classList.remove('disabled')
  }
})

document.getElementById('paste-example').addEventListener('click', () => {
  document.getElementById('input').value = exampleSermon
})

const loadExample = async () => {
  const response = await fetch('example.txt')
  exampleSermon = await response.text()
}

loadChecklist().then(data => {
  checklistData = data
})

loadExample()
renderHistory()
