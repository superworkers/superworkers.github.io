#!/usr/bin/env node
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const getPort = () => {
  const portsPath = path.join(os.homedir(), 'Code', 'ports.csv')

  if (!fs.existsSync(portsPath)) {
    console.log('⚠️  ~/Code/ports.csv not found, using default port')
    return null
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const projectName = packageJson.name

  const csv = fs.readFileSync(portsPath, 'utf8')
  const lines = csv.trim().split('\n').slice(1)

  for (const line of lines) {
    const [name, port] = line.split(',')
    if (name === projectName) {
      return parseInt(port, 10)
    }
  }

  console.log(`⚠️  ${projectName} not found in ports.csv, using default port`)
  return null
}

const port = getPort()
const serveArgs = port ? ['serve', 'build', '-l', port.toString()] : ['serve', 'build']

if (port) console.log(`🚀 Starting dev server on port ${port}...\n`)

const build = spawn('node', ['build', '--dev', '--watch'], { stdio: 'inherit' })
const serve = spawn('npx', serveArgs, { stdio: 'inherit' })

build.on('error', err => {
  console.error('❌ Build process failed:', err.message)
  process.exit(1)
})

build.on('exit', code => {
  if (code !== 0) {
    console.error(`❌ Build process exited with code ${code}`)
    serve.kill()
    process.exit(code)
  }
})

serve.on('error', err => {
  console.error('❌ Serve process failed:', err.message)
  process.exit(1)
})

serve.on('exit', code => {
  if (code !== 0) {
    console.error(`❌ Serve process exited with code ${code}`)
    build.kill()
    process.exit(code)
  }
})

process.on('SIGINT', () => {
  build.kill()
  serve.kill()
  process.exit()
})
