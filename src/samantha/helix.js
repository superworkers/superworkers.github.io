//varun.ca/chillwave/

const svg = document.querySelector('.helix')
svg.parentNode.appendChild(svg.cloneNode(true))

// const path = document.querySelector('#wave')
const path = document.querySelector('.wave')
const m = 0.512286623256592433

function buildWave(w, h) {
  const a = h / 4
  const y = h / 2

  const pathData = [
    'M',
    w * 0,
    y + a / 2,
    'c',
    a * m,
    0,
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
    's',
    -(1 - a) * m,
    a,
    a,
    a,
    's',
    -(1 - a) * m,
    -a,
    a,
    -a,
  ].join(' ')

  // path.setAttribute('d', pathData)
  document.querySelectorAll('.wave').forEach(p => p.setAttribute('d', pathData))
}

buildWave(90, 60)
