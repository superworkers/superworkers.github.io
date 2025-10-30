fetch('forum.md')
  .then(response => response.text())
  .then(markdown => {
    document.getElementById('markdown-content').innerHTML = marked.parse(markdown)
  })
