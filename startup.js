const { spawn } = require('child_process');
const path = require('path');

// Start the main application
const app = spawn('node', ['src/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || 8080 }
});

app.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

app.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
}); 