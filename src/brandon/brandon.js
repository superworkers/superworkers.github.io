let linkedinSchema = null
let profileData = null

const loadSchema = async () => (await fetch('linkedin.json')).json()

const getProfileFormat = schema => {
  const properties = {}

  Object.entries(schema.profile).forEach(([key]) => {
    properties[key] = { type: 'string' }
  })

  properties.skills = { items: { type: 'string' }, type: 'array' }
  properties.experience = {
    items: {
      additionalProperties: false,
      properties: {
        company: { type: 'string' },
        description: { type: 'string' },
        end_date: { type: 'string' },
        location: { type: 'string' },
        start_date: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['company', 'description', 'end_date', 'location', 'start_date', 'title'],
      type: 'object',
    },
    type: 'array',
  }
  properties.education = {
    items: {
      additionalProperties: false,
      properties: {
        degree: { type: 'string' },
        end_date: { type: 'string' },
        school: { type: 'string' },
        start_date: { type: 'string' },
      },
      required: ['degree', 'end_date', 'school', 'start_date'],
      type: 'object',
    },
    type: 'array',
  }
  properties.licenses_certifications = {
    items: {
      additionalProperties: false,
      properties: {
        issuer: { type: 'string' },
        name: { type: 'string' },
        year: { type: 'string' },
      },
      required: ['issuer', 'name', 'year'],
      type: 'object',
    },
    type: 'array',
  }
  properties.volunteer = {
    items: {
      additionalProperties: false,
      properties: {
        cause: { type: 'string' },
        organization: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['cause', 'organization', 'role'],
      type: 'object',
    },
    type: 'array',
  }
  properties.projects = {
    items: {
      additionalProperties: false,
      properties: {
        description: { type: 'string' },
        name: { type: 'string' },
        year: { type: 'string' },
      },
      required: ['description', 'name', 'year'],
      type: 'object',
    },
    type: 'array',
  }
  properties.recommendations = {
    items: {
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        relationship: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['name', 'relationship', 'text'],
      type: 'object',
    },
    type: 'array',
  }

  return {
    name: 'linkedin_profile',
    schema: {
      additionalProperties: false,
      properties,
      required: Object.keys(properties),
      type: 'object',
    },
    strict: true,
    type: 'json_schema',
  }
}

const getImprovementsFormat = () => {
  const feedbackSchema = {
    additionalProperties: false,
    properties: {
      feedback: { type: 'string' },
      grade: { type: 'string' },
    },
    required: ['feedback', 'grade'],
    type: 'object',
  }

  const properties = {
    about: feedbackSchema,
    background_photo: feedbackSchema,
    education: feedbackSchema,
    experience: feedbackSchema,
    headline: feedbackSchema,
    licenses_certifications: feedbackSchema,
    profile_photo: feedbackSchema,
    projects: feedbackSchema,
    recommendations: feedbackSchema,
    skills: feedbackSchema,
    volunteer: feedbackSchema,
  }

  return {
    name: 'linkedin_improvements',
    schema: {
      additionalProperties: false,
      properties,
      required: Object.keys(properties),
      type: 'object',
    },
    strict: true,
    type: 'json_schema',
  }
}

const generateProfile = async context => {
  const startTime = Date.now()
  const requestBody = {
    input: `Based on the following context, generate a complete LinkedIn profile:

${context}`,
    instructions: `You are a LinkedIn profile optimization expert. Generate professional, compelling profile content that:
- Uses specific, concrete language
- Highlights unique value propositions
- Optimizes for searchability and engagement
- Follows LinkedIn best practices
- Makes the person stand out from their peers`,
    model: 'gpt-4.1',
    text: { format: getProfileFormat(linkedinSchema) },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) throw new Error(`API request failed: ${response.status}`)

  const result = await response.json()
  return {
    duration: Math.round((Date.now() - startTime) / 1000),
    profile: JSON.parse(result.output_text),
    tokens: result.usage,
  }
}

const generateImprovements = async profile => {
  const startTime = Date.now()
  const requestBody = {
    input: `Review this LinkedIn profile and provide specific improvement suggestions with grades (A-F) for each section:

${JSON.stringify(profile, null, 2)}`,
    instructions: `You are a LinkedIn profile optimization expert. For each profile section, provide:
- A letter grade (A-F) based on effectiveness, specificity, and engagement
- Specific, actionable feedback on how to improve
- Reference LinkedIn best practices from the tips provided

Focus on:
1. Profile photo and headline optimization
2. About section storytelling
3. Skills relevance and endorsability
4. Experience descriptions (accomplishments over duties)
5. Recommendations quality
6. Overall profile completeness`,
    model: 'gpt-4.1',
    text: { format: getImprovementsFormat() },
  }

  const response = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-responses', {
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!response.ok) throw new Error(`API request failed: ${response.status}`)

  const result = await response.json()
  return {
    duration: Math.round((Date.now() - startTime) / 1000),
    improvements: JSON.parse(result.output_text),
    tokens: result.usage,
  }
}

const renderProfileList = profile => {
  const listEl = document.getElementById('profile-list')
  listEl.textContent = ''

  Object.entries(profile).forEach(([key, value]) => {
    const item = document.createElement('div')
    item.className = 'profile-item'

    const label = document.createElement('strong')
    label.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    item.appendChild(label)

    const valueEl = document.createElement('div')
    if (Array.isArray(value)) {
      if (!value.length) {
        valueEl.textContent = '[]'
      } else if (typeof value[0] === 'string') {
        valueEl.textContent = value.join(', ')
      } else {
        value.forEach(obj => {
          const objDiv = document.createElement('div')
          objDiv.style.marginBottom = '0.5rem'
          Object.entries(obj).forEach(([k, v]) => {
            const line = document.createElement('div')
            line.textContent = `${k}: ${v}`
            objDiv.appendChild(line)
          })
          valueEl.appendChild(objDiv)
        })
      }
    } else {
      valueEl.textContent = value
    }
    item.appendChild(valueEl)

    listEl.appendChild(item)
  })
}

const renderLinkedInPreview = profile => {
  const previewEl = document.getElementById('linkedin-preview')
  previewEl.textContent = ''

  const header = document.createElement('div')
  header.className = 'linkedin-header'

  const photo = document.createElement('div')
  photo.className = 'linkedin-photo'
  header.appendChild(photo)

  const headerInfo = document.createElement('div')
  const name = document.createElement('h2')
  name.textContent = profile.name
  headerInfo.appendChild(name)

  const headline = document.createElement('p')
  headline.textContent = profile.headline
  headerInfo.appendChild(headline)

  const location = document.createElement('p')
  location.textContent = profile.location
  headerInfo.appendChild(location)

  header.appendChild(headerInfo)
  previewEl.appendChild(header)

  if (profile.about) {
    const aboutSection = document.createElement('div')
    aboutSection.className = 'linkedin-section'
    const aboutTitle = document.createElement('h3')
    aboutTitle.textContent = 'About'
    aboutSection.appendChild(aboutTitle)
    const aboutText = document.createElement('p')
    aboutText.textContent = profile.about
    aboutSection.appendChild(aboutText)
    previewEl.appendChild(aboutSection)
  }

  if (profile.experience?.length) {
    const expSection = document.createElement('div')
    expSection.className = 'linkedin-section'
    const expTitle = document.createElement('h3')
    expTitle.textContent = 'Experience'
    expSection.appendChild(expTitle)

    profile.experience.forEach(exp => {
      const expItem = document.createElement('div')
      expItem.style.marginBottom = '1rem'
      const expH4 = document.createElement('h4')
      expH4.textContent = exp.title
      expItem.appendChild(expH4)
      const expCompany = document.createElement('p')
      expCompany.textContent = `${exp.company} · ${exp.start_date} - ${exp.end_date}`
      expItem.appendChild(expCompany)
      const expDesc = document.createElement('p')
      expDesc.textContent = exp.description
      expItem.appendChild(expDesc)
      expSection.appendChild(expItem)
    })

    previewEl.appendChild(expSection)
  }

  if (profile.skills?.length) {
    const skillsSection = document.createElement('div')
    skillsSection.className = 'linkedin-section'
    const skillsTitle = document.createElement('h3')
    skillsTitle.textContent = 'Skills'
    skillsSection.appendChild(skillsTitle)
    const skillsList = document.createElement('p')
    skillsList.textContent = profile.skills.join(' · ')
    skillsSection.appendChild(skillsList)
    previewEl.appendChild(skillsSection)
  }
}

const renderImprovements = improvements => {
  const improvementsEl = document.getElementById('improvements')
  improvementsEl.textContent = ''

  Object.entries(improvements).forEach(([key, { feedback, grade }]) => {
    const item = document.createElement('div')
    item.className = 'improvement'

    const title = document.createElement('h4')
    title.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    const gradeSpan = document.createElement('span')
    gradeSpan.className = 'grade'
    gradeSpan.textContent = grade
    title.appendChild(document.createTextNode(' '))
    title.appendChild(gradeSpan)
    item.appendChild(title)

    const feedbackP = document.createElement('p')
    feedbackP.textContent = feedback
    item.appendChild(feedbackP)

    improvementsEl.appendChild(item)
  })
}

document.querySelectorAll('.view-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')

    const view = tab.dataset.view
    document.getElementById('import-view').classList.toggle('hidden', view !== 'import')
    document.getElementById('record-view').classList.toggle('hidden', view !== 'record')
    document.getElementById('generate-view').classList.toggle('hidden', view !== 'generate')
    document.getElementById('generate-view-preview').classList.toggle('hidden', view !== 'generate')
    document.getElementById('improve-view').classList.toggle('hidden', view !== 'improve')
  })
})

document.getElementById('import-btn').addEventListener('click', () => {
  alert('This feature requires a PRO subscription')
})

document.getElementById('record-btn').addEventListener('click', () => {
  alert('This feature requires a PRO subscription')
})

document.getElementById('interview-btn').addEventListener('click', () => {
  alert('This feature requires a PRO subscription')
})

document.getElementById('context').addEventListener('input', e => {
  const hasContext = !!e.target.value.trim().length
  document.getElementById('generate-btn').disabled = !hasContext
  document.getElementById('generate-message').style.display = hasContext ? 'none' : 'block'
})

document.getElementById('linkedin-url').addEventListener('input', e => {
  const value = e.target.value
  if (value.includes('linkedin.com/in/')) {
    const username = value.split('in/').pop()
    e.target.value = username
  }
})

document.getElementById('generate-btn').addEventListener('click', async () => {
  const btn = document.getElementById('generate-btn')
  const context = document.getElementById('context').value.trim()

  if (!context) return

  btn.disabled = true
  btn.textContent = 'Generating...'

  try {
    const { profile } = await generateProfile(context)
    profileData = profile

    renderProfileList(profile)
    renderLinkedInPreview(profile)
    document.getElementById('improve-btn').disabled = false
    document.getElementById('improve-message').style.display = 'none'
  } catch (err) {
    alert(`Error: ${err.message}`)
  } finally {
    btn.disabled = false
    btn.textContent = 'Generate Profile'
  }
})

document.getElementById('improve-btn').addEventListener('click', async () => {
  const btn = document.getElementById('improve-btn')

  if (!profileData) return

  btn.disabled = true
  btn.textContent = 'Generating suggestions...'

  try {
    const { improvements } = await generateImprovements(profileData)
    renderImprovements(improvements)
  } catch (err) {
    alert(`Error: ${err.message}`)
  } finally {
    btn.disabled = false
    btn.textContent = 'Generate Suggestions'
  }
})

loadSchema().then(schema => {
  linkedinSchema = schema

  const defaultProfile = {
    ...schema.profile,
    education: schema.education,
    experience: schema.experience,
    licenses_certifications: schema.licenses_certifications,
    projects: schema.projects,
    recommendations: schema.recommendations,
    skills: schema.skills,
    volunteer: schema.volunteer,
  }

  renderProfileList(defaultProfile)
  renderLinkedInPreview(defaultProfile)
})
