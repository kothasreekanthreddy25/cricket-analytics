const { execSync } = require('child_process')
const port = process.argv[2] || '3000'
try {
  const r = execSync('netstat -ano', { encoding: 'utf8' })
  const lines = r.split('\n').filter(l => l.includes(':' + port) && l.includes('LISTENING'))
  lines.forEach(l => {
    const pid = l.trim().split(/\s+/).pop()
    if (pid && /^\d+$/.test(pid)) {
      console.log('Killing PID', pid, 'on port', port)
      try { execSync('taskkill /F /PID ' + pid) } catch {}
    }
  })
  if (!lines.length) console.log('No process on port', port)
} catch (e) {
  console.log(e.message)
}
