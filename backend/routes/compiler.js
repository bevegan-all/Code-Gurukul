const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
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
  'C': { ext: 'c', runCmd: './a.out', compileCmd: 'gcc' },
  'Go': { ext: 'go', runCmd: 'go run', compileCmd: null },
  'R': { ext: 'R', runCmd: 'Rscript', compileCmd: null },
  'PostgreSQL': { ext: 'sql', runCmd: 'psql -f', compileCmd: null },
  'MongoDB': { ext: 'js', runCmd: 'mongosh --file', compileCmd: null },
  'HBase': { ext: 'hb', runCmd: 'hbase shell', compileCmd: null }
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

  // Kill existing process for this socket if it's still running
  if (activeProcesses.has(socketId)) {
    console.log(`[compiler] Killing existing process for socket ${socketId}`);
    try {
       const proc = activeProcesses.get(socketId);
       if (process.platform === 'win32') {
         exec(`taskkill /F /T /PID ${proc.pid}`, (err) => {
            if (err) console.error('Taskkill error (pre-run):', err);
         });
       } else {
         proc.kill('SIGKILL');
       }
       activeProcesses.delete(socketId);
    } catch (e) { console.error('Error killing old proc:', e); }
  }

  const normalizedLang = Object.keys(LANG_MAP).find(
    key => key.toLowerCase() === language.trim().toLowerCase()
  );
  
  const langConfig = LANG_MAP[normalizedLang];
  if (!langConfig) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  // Create a unique execution directory
  const execDir = path.join(TMP_DIR, uuidv4());
  fs.mkdirSync(execDir, { recursive: true });

  const fileName = language === 'Java' ? 'Main.java' : `source.${langConfig.ext}`;
  const filePath = path.join(execDir, fileName);

  let finalCode = code;
  if (language === 'Python' || normalizedLang === 'Python') {
    // Inject logic to make Matplotlib windows stay on top and auto-save snapshots for our integrated viewer
    // ADDED: Self-termination daemon to handle cases where taskkill is blocked by GUI loop
     const injection = `
import sys
import os
import threading
import time

def _monitor_kill_signal():
    kill_file = os.path.join(os.getcwd(), '.kill')
    while True:
        if os.path.exists(kill_file):
            os._exit(0)
        time.sleep(0.5)

_t = threading.Thread(target=_monitor_kill_signal, daemon=True)
_t.start()

try:
    import matplotlib
    import matplotlib.pyplot as plt
    # Ensure window stays on top if using a GUI backend
    def _make_topmost():
        try:
            fig = plt.gcf()
            if hasattr(fig.canvas.manager, 'window'):
                window = fig.canvas.manager.window
                if hasattr(window, 'attributes'): # Tk
                    window.attributes('-topmost', 1)
                elif hasattr(window, 'setWindowFlags'): # Qt
                    from PyQt5 import QtCore
                    window.setWindowFlags(window.windowFlags() | QtCore.Qt.WindowStaysOnTopHint)
        except: pass

    # Auto-save plot whenever show() is called so our integrated viewer catches it
    _old_show = plt.show
    def _new_show(*args, **kwargs):
        _make_topmost()
        try: plt.savefig('plot.png', bbox_inches='tight')
        except: pass
        return _old_show(*args, **kwargs)
    plt.show = _new_show
except: pass
`;
    finalCode = injection + '\n' + finalCode;
  }


  if (language === 'R' || normalizedLang === 'R') {
    // Auto-capture R plots into plot.png for our integrated viewer
    const hasPlotting = /plot\(|hist\(|barplot\(|boxplot\(|pie\(|lines\(|points\(|ggplot\(|curve\(|smooth\|symbols\(|contour\(|filled\.contour\(|image\(|persp\(|dotchart\(|stripchart\(|mosaicplot\(|sunflowerplot\(|assocplot\(|cdplot\(|spineplot\(|pairs\(|stars\(|symbols\(/.test(finalCode);
    if (hasPlotting && !finalCode.includes('png(')) {
       finalCode = `
# Use Cairo if available, else standard png
if (requireNamespace("Cairo", quietly = TRUE)) {
  options(bitmapType='cairo')
  Cairo::CairoPNG("plot.png", width=800, height=600)
} else {
  png("plot.png", width=800, height=600)
}

tryCatch({
${finalCode}
}, error = function(e) {
  cat(paste0("[Error]: ", e$message, "\\n"))
})

dev.off()
if (file.exists("plot.png")) {
  cat("[System]: Diagram rendered successfully.\\n")
} else {
  cat("[Warning]: Diagram file was not created.\\n")
}
`;
    }
  }

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

    // Robust Path Detection for R on Windows
    if (language === 'R' || normalizedLang === 'R') {
       const searchPaths = ['C:\\Program Files\\R', 'C:\\PROGRA~1\\R'];
       let foundPath = null;
       
       for (const base of searchPaths) {
         if (fs.existsSync(base)) {
           const versions = fs.readdirSync(base).filter(f => f.startsWith('R-') || f.startsWith('R-45')).sort().reverse();
           for (const v of versions) {
             const p = path.join(base, v, 'bin', 'Rscript.exe');
             if (fs.existsSync(p)) {
               foundPath = p;
               break;
             }
           }
         }
         if (foundPath) break;
       }

       if (foundPath) {
         cmd = `"${foundPath}"`;
       } else {
         // Fallback to basic command if no directory found
         cmd = 'Rscript';
       }
    }

    console.log(`[compiler spawn]: ${cmd} ${args.join(' ')}`);
    
    const checkImages = () => {
      try {
        if (!fs.existsSync(execDir)) return;
        const files = fs.readdirSync(execDir);
        // Look for any new image file that isn't the source
        const imgFile = files.find(f => f.match(/\.(png|jpg|jpeg|gif)$/i));
        if (imgFile) {
          const imgPath = path.join(execDir, imgFile);
          const data = fs.readFileSync(imgPath).toString('base64');
          const ext = path.extname(imgFile).slice(1);
          if (io) io.to(socketId).emit('code:graph', { 
            data: `data:image/${ext};base64,${data}`,
            filename: imgFile
          });
          // Remove file so we don't send it again in the next interval
          fs.unlinkSync(imgPath);
        }
      } catch (e) {
        // execDir might have been cleaned up
      }
    };

    const imgInterval = setInterval(checkImages, 2000);

    const child = spawn(cmd, args, { 
      cwd: execDir, 
      shell: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1' } 
    });
    child.cwd = execDir; // Attach for stop logic
    activeProcesses.set(socketId, child);

    // Provide some timeout mechanism (allow sufficient time for user input if interactive)
    const timeout = setTimeout(() => {
      if (!hasExited) {
        console.log(`[compiler] Timeout reached, killing process`);
        if (process.platform === 'win32') {
          exec(`taskkill /F /T /PID ${child.pid}`);
        } else {
          child.kill('SIGKILL');
        }
        if (io) io.to(socketId).emit('code:output', { data: '\n\n[Error]: Execution Timed Out (> 60 seconds)' });
      }
    }, 60000);

    child.stdout.on('data', (data) => {
      console.log(`[compiler stdout]:`, data.toString());
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    child.stderr.on('data', (data) => {
      console.log(`[compiler stderr]:`, data.toString());
      if (io) io.to(socketId).emit('code:output', { data: data.toString() });
    });

    child.on('close', (code) => {
      hasExited = true;
      clearInterval(imgInterval);
      checkImages(); // Final check
      console.log(`[compiler close]: exit code ${code}`);
      clearTimeout(timeout);
      if (io) io.to(socketId).emit('code:done', { exitCode: code });
      cleanup();
    });
    
    child.on('error', (err) => {
      hasExited = true;
      clearInterval(imgInterval);
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

router.post('/stop', auth, async (req, res) => {
  const { socketId } = req.body;
  if (activeProcesses.has(socketId)) {
    try {
      const proc = activeProcesses.get(socketId);
      
      // 1. SIGNAL FILE KILL (For Python self-termination)
      if (proc.cwd) {
        try { fs.writeFileSync(path.join(proc.cwd, '.kill'), '1'); } catch(e){}
      }

      // 2. TASKKILL (Forceful OS-level kill)
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${proc.pid}`, (err) => {
          if (err) console.log('Taskkill error:', err);
        });
      } else {
        proc.kill('SIGKILL');
      }
      activeProcesses.delete(socketId);
      return res.json({ success: true, message: 'Process stopped' });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to stop process' });
    }
  }
  res.json({ success: true, message: 'No process running' });
});

module.exports = { router, activeProcesses };
