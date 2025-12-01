let schema = null

const loadSchema = async () => {
  const response = await fetch('week-plan.json')
  schema = await response.json()
}

const saveToLocalStorage = (input, plan) => {
  const runs = JSON.parse(localStorage.getItem('larry') || '[]')
  runs.unshift({ created: Date.now(), input, plan })
  localStorage.setItem('larry', JSON.stringify(runs.slice(0, 10)))
  renderHistory()
}

const loadFromLocalStorage = index => {
  const runs = JSON.parse(localStorage.getItem('larry') || '[]')
  const run = runs[index]
  if (!run) return
  document.getElementById('context').value = run.input
  renderPlan(run.plan)
}

const renderHistory = () => {
  const runs = JSON.parse(localStorage.getItem('larry') || '[]')
  const container = document.getElementById('history')
  container.textContent = ''

  if (!runs.length) return

  const title = document.createElement('h2')
  title.textContent = 'History'
  container.appendChild(title)

  const list = document.createElement('div')
  list.className = 'history-list'
  runs.forEach((run, index) => {
    const item = document.createElement('button')
    item.className = 'history-item'
    const date = new Date(run.created).toLocaleString()
    const preview = run.input.substring(0, 100)
    item.textContent = `${date} — ${preview}...`
    item.addEventListener('click', () => loadFromLocalStorage(index))
    list.appendChild(item)
  })
  container.appendChild(list)
}

const getPlanFormat = () => ({
  name: 'weekly_plan',
  schema: {
    additionalProperties: false,
    properties: {
      friday: {
        additionalProperties: false,
        properties: {
          blockers: { items: { type: 'string' }, type: 'array' },
          meetings: { items: { type: 'string' }, type: 'array' },
          tasks: {
            items: {
              additionalProperties: false,
              properties: {
                assignee: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                id: { type: 'string' },
                period: { enum: ['morning', 'afternoon'], type: 'string' },
              },
              required: ['id', 'assignee', 'description', 'hours', 'period'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['meetings', 'tasks', 'blockers'],
        type: 'object',
      },
      key_risks: { items: { type: 'string' }, type: 'array' },
      monday: {
        additionalProperties: false,
        properties: {
          blockers: { items: { type: 'string' }, type: 'array' },
          meetings: { items: { type: 'string' }, type: 'array' },
          tasks: {
            items: {
              additionalProperties: false,
              properties: {
                assignee: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                id: { type: 'string' },
                period: { enum: ['morning', 'afternoon'], type: 'string' },
              },
              required: ['id', 'assignee', 'description', 'hours', 'period'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['meetings', 'tasks', 'blockers'],
        type: 'object',
      },
      success_metrics: { items: { type: 'string' }, type: 'array' },
      thursday: {
        additionalProperties: false,
        properties: {
          blockers: { items: { type: 'string' }, type: 'array' },
          meetings: { items: { type: 'string' }, type: 'array' },
          tasks: {
            items: {
              additionalProperties: false,
              properties: {
                assignee: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                id: { type: 'string' },
                period: { enum: ['morning', 'afternoon'], type: 'string' },
              },
              required: ['id', 'assignee', 'description', 'hours', 'period'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['meetings', 'tasks', 'blockers'],
        type: 'object',
      },
      tuesday: {
        additionalProperties: false,
        properties: {
          blockers: { items: { type: 'string' }, type: 'array' },
          meetings: { items: { type: 'string' }, type: 'array' },
          tasks: {
            items: {
              additionalProperties: false,
              properties: {
                assignee: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                id: { type: 'string' },
                period: { enum: ['morning', 'afternoon'], type: 'string' },
              },
              required: ['id', 'assignee', 'description', 'hours', 'period'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['meetings', 'tasks', 'blockers'],
        type: 'object',
      },
      wednesday: {
        additionalProperties: false,
        properties: {
          blockers: { items: { type: 'string' }, type: 'array' },
          meetings: { items: { type: 'string' }, type: 'array' },
          tasks: {
            items: {
              additionalProperties: false,
              properties: {
                assignee: { type: 'string' },
                description: { type: 'string' },
                hours: { type: 'number' },
                id: { type: 'string' },
                period: { enum: ['morning', 'afternoon'], type: 'string' },
              },
              required: ['id', 'assignee', 'description', 'hours', 'period'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['meetings', 'tasks', 'blockers'],
        type: 'object',
      },
    },
    required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'key_risks', 'success_metrics'],
    type: 'object',
  },
  strict: true,
  type: 'json_schema',
})

const renderPlan = plan => {
  const container = document.getElementById('plan')
  container.textContent = ''

  const grid = document.createElement('div')
  grid.className = 'week-grid'

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  days.forEach(day => {
    const card = document.createElement('div')
    card.className = 'day-card'

    const title = document.createElement('h3')
    title.textContent = day.toUpperCase()
    card.appendChild(title)

    const meetings = document.createElement('div')
    meetings.className = 'plan-section'
    const mLabel = document.createElement('strong')
    mLabel.textContent = 'Meetings'
    meetings.appendChild(mLabel)
    if (plan[day].meetings?.length) {
      plan[day].meetings.forEach(m => {
        const item = document.createElement('div')
        item.className = 'meeting-item'
        item.textContent = m
        meetings.appendChild(item)
      })
    }
    card.appendChild(meetings)

    const morningTasks = plan[day].tasks?.filter(t => t.period === 'morning') || []
    const afternoonTasks = plan[day].tasks?.filter(t => t.period === 'afternoon') || []

    const morning = document.createElement('div')
    morning.className = 'plan-section'
    const morningLabel = document.createElement('strong')
    morningLabel.textContent = 'Morning'
    morning.appendChild(morningLabel)
    morningTasks.forEach(t => {
      const item = document.createElement('div')
      item.className = 'task-item'
      item.textContent = `[${t.id}] ${t.assignee} • ${t.description} (${t.hours}h)`
      morning.appendChild(item)
    })
    card.appendChild(morning)

    const afternoon = document.createElement('div')
    afternoon.className = 'plan-section'
    const afternoonLabel = document.createElement('strong')
    afternoonLabel.textContent = 'Afternoon'
    afternoon.appendChild(afternoonLabel)
    afternoonTasks.forEach(t => {
      const item = document.createElement('div')
      item.className = 'task-item'
      item.textContent = `[${t.id}] ${t.assignee} • ${t.description} (${t.hours}h)`
      afternoon.appendChild(item)
    })
    card.appendChild(afternoon)

    const blockers = document.createElement('div')
    blockers.className = 'plan-section'
    const bLabel = document.createElement('strong')
    bLabel.textContent = 'Blockers'
    blockers.appendChild(bLabel)
    if (plan[day].blockers?.length) {
      plan[day].blockers.forEach(b => {
        const item = document.createElement('div')
        item.textContent = `⚠ ${b}`
        blockers.appendChild(item)
      })
    }
    card.appendChild(blockers)

    grid.appendChild(card)
  })

  container.appendChild(grid)

  const footer = document.createElement('div')
  footer.className = 'plan-footer'

  const risks = document.createElement('div')
  risks.className = 'footer-section'
  const rTitle = document.createElement('h3')
  rTitle.textContent = 'KEY RISKS'
  risks.appendChild(rTitle)
  plan.key_risks.forEach(r => {
    const item = document.createElement('div')
    item.textContent = `• ${r}`
    risks.appendChild(item)
  })
  footer.appendChild(risks)

  const metrics = document.createElement('div')
  metrics.className = 'footer-section'
  const mTitle = document.createElement('h3')
  mTitle.textContent = 'SUCCESS METRICS'
  metrics.appendChild(mTitle)
  plan.success_metrics.forEach(m => {
    const item = document.createElement('div')
    item.textContent = `• ${m}`
    metrics.appendChild(item)
  })
  footer.appendChild(metrics)

  container.appendChild(footer)
}

document.getElementById('generate-example')?.addEventListener('click', async () => {
  const btn = document.getElementById('generate-example')
  const textarea = document.getElementById('context')

  btn.disabled = true
  btn.textContent = 'Generating standup...'

  try {
    const requestBody = {
      input: `Generate a realistic team standup transcript with 4-5 people going around sharing updates.

Include:
- Work updates (what they finished yesterday, working on today, blockers)
- Availability/capacity updates when relevant (appointments, travel, out of office, late starts - things that affect sprint velocity)
- One person should give a notably longer, more detailed update than others
- Natural, conversational tone
- Realistic project work

Avoid casual personal life updates - focus on work and availability that impacts the team.

Make it feel like an actual standup conversation.`,
      instructions:
        'You are documenting a real team standup meeting. Capture natural conversation with varying update lengths.',
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
    btn.textContent = 'Generate example standup'
  }
})

document.getElementById('generate')?.addEventListener('click', async () => {
  const context = document.getElementById('context').value.trim()
  const btn = document.getElementById('generate')
  const planEl = document.getElementById('plan')

  if (!context) {
    alert('Please enter context')
    return
  }

  btn.disabled = true
  btn.textContent = 'Generating plan...'
  planEl.textContent = 'Analyzing context and generating weekly plan...'

  try {
    const requestBody = {
      input: `Based on the following team context, generate a realistic, granular weekly plan for Monday through Friday.

Context:
${context}

Requirements:
- Use realistic task IDs (e.g., DASH-247, BUG-891, FEAT-103)
- Include specific time estimates in hours (0.5, 1, 2, 3, etc)
- List scheduled meetings with times (e.g., "9:00 AM - Standup (15m)")
- Flag actual blockers if evident from context
- Tasks should be concrete and measurable (not vague like "work on feature")
- Include specific details from the standup (bug numbers, PR reviews, specific features)
- Be objective and realistic about capacity (don't overload days)
- Categorize each task as "morning" or "afternoon" based on logical flow and dependencies`,
      instructions: `You are Larry, a no-BS project manager who creates brutally realistic plans. Your approach:
- Extract specific work items from standup context (bug fixes, PRs, features)
- Assign realistic time estimates based on task complexity
- Identify dependencies and blockers from what people said
- Account for meetings reducing available work hours
- Call out capacity constraints when people are overloaded
- Be concrete and specific - no generic placeholder tasks
- Use actual task identifiers when mentioned in context`,
      model: 'gpt-4.1',
      text: {
        format: getPlanFormat(),
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
    const plan = JSON.parse(result.output_text)
    renderPlan(plan)
    saveToLocalStorage(context, plan)
  } catch (err) {
    alert(`Error: ${err.message}`)
    planEl.textContent = ''
  } finally {
    btn.disabled = false
    btn.textContent = 'Generate Weekly Plan'
  }
})

loadSchema()
renderHistory()
