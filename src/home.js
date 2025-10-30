const BRAND = 1

const frames = document.querySelectorAll('.superwork')
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

fetch('projects.json')
  .then(response => response.json())
  .then(projects => {
    const grid = document.getElementById('projects-grid')
    projects.forEach(project => {
      const media = project.image
        ? `<img src="${project.image}" alt="${project.name}" />`
        : project.video
          ? `<video autoplay loop muted playsinline><source src="${project.video}" type="video/mp4" /></video>`
          : ''
      const style = project.color ? `style="background: ${project.color}"` : ''
      grid.innerHTML += `
        <a class="ghost project-card ${project.slug}" href="/${project.slug}" ${style}>
          ${media}
          <h3>${project.name}</h3>
        </a>
      `
    })
  })
