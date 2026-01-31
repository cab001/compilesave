const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'python', 'main.py');
const py = spawn('python3', [scriptPath, "main.c:6:5: error: unknown type name 'Node'"]);

let out = '';
py.stdout.on('data', (c) => out += c.toString());
py.stderr.on('data', (c) => console.error('PYERR:', c.toString()));
py.on('close', (code) => {
  console.log('exit code', code);
  try {
    const json = JSON.parse(out);
    console.log('parsed:', json);
  } catch (e) {
    console.error('Failed to parse JSON from Python:', out);
  }
});
