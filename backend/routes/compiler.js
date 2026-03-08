const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Ensure tmp directory exists
const TMP_DIR = path.join(os.tmpdir(), 'codegurukul_compiler');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const activeProcesses = new Map();

// Map frontend languages to file extensions and execution commands
const LANG_MAP = {
  'Python': { ext: 'py', runCmd: 'python -u', compileCmd: null },
  'Node.js': { ext: 'js', runCmd: 'node', compileCmd: null },
  'Java': { ext: 'java', runCmd: 'java', compileCmd: 'javac' },
  'C++': { ext: 'cpp', runCmd: './a.out', compileCmd: 'g++' },
  'C': { ext: 'c', runCmd: './a.out', compileCmd: 'gcc' }
};

if (process.platform === 'win32') {
  LANG_MAP['C++'].runCmd = 'a.exe';
  LANG_MAP['C'].runCmd = 'a.exe';
}

router.post('/run', auth, async (req, res) => {
  const { code, language, socketId } = req.body;

  if (!code || !language || !socketId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const langConfig = LANG_MAP[language];
  if (!langConfig) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  // Create a unique execution directory
  const execDir = path.join(TMP_DIR, uuidv4());
  fs.mkdirSync(execDir, { recursive: true });

  const fileName = language === 'Java' ? 'Main.java' : `source.${langConfig.ext}`;
  const filePath = path.join(execDir, fileName);

  let finalCode = code;
  if (language === 'C' || language === 'C++') {
    // Force unbuffered stdout so interactive prompts ('Enter number:') show instantly over sockets instead of buffering until exit
    if (!finalCode.includes('<stdio.h>')) {
      finalCode = '#include <stdio.h>\n' + finalCode;
    }
    finalCode = finalCode.replace(
      /int\s+main\s*\(([^)]*)\)\s*\{/, 
      "int main($1) {\n    setvbuf(stdout, NULL, _IONBF, 0);\n"
    );
  }

  fs.writeFileSync(filePath, finalCode);

  res.json({ success: true, message: 'Execution started' });

  const io = req.io;
  console.log(`[compiler] Executing code for socket ${socketId} in ${execDir}`);

  const cleanup = () => {
    try {
      if (activeProcesses.has(socketId)) activeProcesses.delete(socketId);
      if (fs.existsSync(execDir)) {
        fs.rmSync(execDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Compiler cleanup error:', err);
    }
  };

    const executeCode = () => {
    let hasExited = false;
    
    // Windows requires exact command handling
    let cmd = langConfig.runCmd;
    let args = language === 'Java' ? ['Main'] : (language === 'C++' || language === 'C' ? [] : [filePath]);

    console.log(`[compiler spawn]: ${cmd} ${args.join(' ')}`);
    
    const runProcess = spawn(cmd, args, {
      cwd: execDir,
      shell: true
    });
    
    activeProcesses.set(socketId, runProcess);

    // Provide some timeout mechanism (allow sufficient time for user input if interactive)
    const timeout = setTimeout(() => {
      if (!hasExited) {
        console.log(`[compiler] Timeout reached, killing process`);
        runProcess.kill('SIGINT'); // softer kill first
        setTimeout(() => runProcess.kill('SIGKILL'), 1000);
        if (io) io.to(socketId).emit('code:output', { data: '\n\n[Error]: Execution Timed Out (> 60 seconds)' });
      }
    }, 60000);

    runProcess.stdout.on('data', (data) => {
      console.log(`[compiler stdout]:`, data.toString());
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    runProcess.stderr.on('data', (data) => {
      console.log(`[compiler stderr]:`, data.toString());
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    runProcess.on('close', (code) => {
      hasExited = true;
      console.log(`[compiler close]: exit code ${code}`);
      clearTimeout(timeout);
      if (io) io.to(socketId).emit('code:done', { exitCode: code });
      cleanup();
    });
    
    runProcess.on('error', (err) => {
      hasExited = true;
      console.log(`[compiler error]:`, err.message);
      clearTimeout(timeout);
      if (io) io.to(socketId).emit('code:output', { data: `\n[System Error]: ${err.message}` });
      if (io) io.to(socketId).emit('code:done', { exitCode: 1 });
      cleanup();
    });
  };

  if (langConfig.compileCmd) {
    const compileProcess = spawn(langConfig.compileCmd, [fileName], {
      cwd: execDir,
      shell: true
    });

    compileProcess.stdout.on('data', (data) => {
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    compileProcess.stderr.on('data', (data) => {
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    compileProcess.on('close', (code) => {
      if (code !== 0) {
        if (io) io.to(socketId).emit('code:done', { exitCode: code });
        cleanup();
      } else {
        executeCode();
      }
    });

    compileProcess.on('error', (err) => {
      if (io) io.to(socketId).emit('code:output', { data: `\n[Compile Error]: ${err.message}` });
      if (io) io.to(socketId).emit('code:done', { exitCode: 1 });
      cleanup();
    });
  } else {
    executeCode();
  }
});

module.exports = { router, activeProcesses };
