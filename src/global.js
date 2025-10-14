//clarity.microsoft.com
/*;(function (c, l, a, r, i, t, y) {
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
})(window, document, 'clarity', 'script', 'NEW_CLARITY_CODE_HERE')*/

// ScrollReveal animations
const scrollConfig = {
  cleanup: true,
  distance: '20%',
  interval: 100,
  origin: 'bottom',
}
ScrollReveal().reveal('h1, h2, h3, p, a, button, img, video', scrollConfig)
