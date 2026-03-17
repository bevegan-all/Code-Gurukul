import { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let isCurrentlyRestricted = true;
let guardianInterval = null;
let keyboardHookProcess = null; // PowerShell WH_KEYBOARD_LL hook process

// ─────────────────────────────────────────────────────────────────────────────
// LOW-LEVEL KEYBOARD HOOK via PowerShell + inline C#
//
// WH_KEYBOARD_LL is a Windows kernel-level keyboard hook that intercepts ALL
// keystrokes BEFORE the OS processes them. This is how professional kiosk
// software blocks Alt+Tab, Win+D, Win+Tab, etc.
//
// We spawn a hidden PowerShell process that:
//   1. Compiles inline C# to register SetWindowsHookEx(WH_KEYBOARD_LL)
//   2. In the hook callback, blocks Win keys and Alt+Tab by returning 1
//      (any non-CallNextHookEx return value tells Windows to drop the key)
//   3. Runs Application.Run() — the Windows message loop that keeps the hook alive
//
// When teacher unrestricts: we kill the PowerShell process → hook removed automatically.
// ─────────────────────────────────────────────────────────────────────────────
const POWERSHELL_HOOK_SCRIPT = `
# Codegurukul_Kiosk_Hook_v1
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class KioskKeyHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN     = 0x0100;
    private const int WM_SYSKEYDOWN  = 0x0104;

    // Virtual key codes to block
    private const int VK_LWIN  = 0x5B;  // Left Win key
    private const int VK_RWIN  = 0x5C;  // Right Win key
    private const int VK_TAB   = 0x09;  // Tab
    private const int VK_MENU  = 0x12;  // Alt
    private const int VK_ESC   = 0x1B;  // Escape (only when Alt is down)

    public delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    private static LowLevelKeyboardProc _cb;
    private static IntPtr _hook = IntPtr.Zero;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    // GetAsyncKeyState lets us check modifier keys in the hook callback
    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int vKey);

    public static void Start() {
        _cb = HookProc;  // Keep delegate alive in static field (prevents GC)
        // For WH_KEYBOARD_LL, hMod can be IntPtr.Zero — hook is system-wide
        _hook = SetWindowsHookEx(WH_KEYBOARD_LL, _cb, IntPtr.Zero, 0);
        Application.Run();  // Windows message loop — keeps the hook alive
    }

    private static IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
            int vk = Marshal.ReadInt32(lParam);
            bool altDown = (GetAsyncKeyState(VK_MENU) & 0x8000) != 0;

            // Block ALL Win key combinations (Win+D, Win+Tab, Win+L, Win+R, etc.)
            if (vk == VK_LWIN || vk == VK_RWIN) {
                return (IntPtr)1;  // Non-zero return = key is consumed, OS ignores it
            }

            // Block Alt+Tab (task switcher)
            if (altDown && vk == VK_TAB) {
                return (IntPtr)1;
            }

            // Block Alt+F4 (close window)
            if (altDown && vk == 0x73) {  // 0x73 = VK_F4
                return (IntPtr)1;
            }

            // Block Alt+Esc (switch windows without thumbnail)
            if (altDown && vk == VK_ESC) {
                return (IntPtr)1;
            }
        }
        return CallNextHookEx(_hook, nCode, wParam, lParam);
    }
}
'@ -ReferencedAssemblies 'System.Windows.Forms'

[KioskKeyHook]::Start()
`;

function killAllOrphanedHooks() {
  try {
    // Using an identifiable string in the command line so we only kill our own hooks via OS-level WMI 
    execSync('wmic process where "name=\'powershell.exe\' and commandline like \'%Codegurukul_Kiosk_Hook_v1%\'" call terminate', {
      windowsHide: true,
      stdio: 'ignore'
    });
    console.log('[KeyHook] All orphaned hooks destroyed.');
  } catch (e) {
    // Expected to throw if no processes to kill
  }
}

function startKeyboardHook() {
  if (keyboardHookProcess) return; // Already running logic

  // Pre-cleanup in case of ghost Vite hot-reloads
  killAllOrphanedHooks();

  keyboardHookProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle', 'Hidden',
    '-Command', POWERSHELL_HOOK_SCRIPT
  ], {
    detached: false,
    stdio: 'ignore',
    windowsHide: true,
  });

  keyboardHookProcess.on('error', (err) => {
    console.error('[KeyHook] PowerShell hook failed to start:', err.message);
    keyboardHookProcess = null;
  });

  keyboardHookProcess.on('exit', (code) => {
    console.log('[KeyHook] PowerShell hook exited, code:', code);
    keyboardHookProcess = null;
  });

  console.log('[KeyHook] Started WH_KEYBOARD_LL hook, PID:', keyboardHookProcess?.pid);
}

function stopKeyboardHook() {
  if (keyboardHookProcess) {
    try {
      spawn('taskkill', ['/pid', keyboardHookProcess.pid.toString(), '/f', '/t']);
    } catch(e) {}
    keyboardHookProcess = null;
  }
  // Guarantee ANY ghost processes are destroyed so Alt+Tab and Win keys are restored instantly
  killAllOrphanedHooks();
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardian — polls every 16ms (one animation frame at 60fps).
// Backup for anything that slips past the keyboard hook (Win+D via mouse click, etc.)
// ─────────────────────────────────────────────────────────────────────────────
function startGuardian() {
  if (guardianInterval) return;
  guardianInterval = setInterval(() => {
    if (!isCurrentlyRestricted || !mainWindow || mainWindow.isDestroyed()) return;

    const needsRestore =
      mainWindow.isMinimized() ||
      !mainWindow.isVisible() ||
      !mainWindow.isFocused() ||
      !mainWindow.isKiosk() ||
      !mainWindow.isFullScreen();

    if (needsRestore) snapBack();
  }, 16);
}

function stopGuardian() {
  if (guardianInterval) {
    clearInterval(guardianInterval);
    guardianInterval = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// snapBack — restores the locked state completely.
// ─────────────────────────────────────────────────────────────────────────────
function snapBack() {
  if (!mainWindow || mainWindow.isDestroyed() || !isCurrentlyRestricted) return;

  const primaryDisplay = screen.getPrimaryDisplay();

  mainWindow.setKiosk(true);
  mainWindow.setFullScreen(true);

  // Toggle alwaysOnTop off→on to forcibly push window to absolute top of z-order
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.setResizable(false);
  mainWindow.setMovable(false);
  mainWindow.setBounds(primaryDisplay.bounds);

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();

  // app.focus({ steal: true }) overrides Windows' focus-stealing prevention
  app.focus({ steal: true });
  mainWindow.focus();
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply full lockdown
// ─────────────────────────────────────────────────────────────────────────────
function applyRestriction() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isCurrentlyRestricted = true;
  snapBack();
  startKeyboardHook(); // Start OS-level key blocking
  startGuardian();     // Start 16ms visual guardian as backup
}

// ─────────────────────────────────────────────────────────────────────────────
// Release lockdown (teacher unrestricted the class)
// ─────────────────────────────────────────────────────────────────────────────
function applyUnrestriction() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  isCurrentlyRestricted = false;

  stopKeyboardHook(); // Kill the PowerShell hook — all keys restored immediately
  stopGuardian();
  globalShortcut.unregisterAll();

  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);
  mainWindow.setMovable(true);
  
  // Do NOT minimize here, otherwise the student misses the 'Access Granted' notification.
}

// ─────────────────────────────────────────────────────────────────────────────
// Create the main window
// ─────────────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a', // Prevents white flash during any repaint
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    kiosk: true,
    resizable: false,
    movable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ── Block close button / Alt+F4 as backup (hook also blocks Alt+F4) ─────────
  mainWindow.on('close', (e) => {
    if (isCurrentlyRestricted) {
      e.preventDefault();
      snapBack();
    }
  });

  // ── Minimize: Windows may still minimise in edge cases — restore immediately ─
  mainWindow.on('minimize', () => {
    if (isCurrentlyRestricted) {
      setImmediate(() => snapBack());
    }
  });

  // ── Hide (Win+D backup — hook blocks Win key but just in case) ───────────────
  mainWindow.on('hide', () => {
    if (isCurrentlyRestricted) {
      setImmediate(() => snapBack());
    }
  });

  // ── Blur: snap back as fallback ──────────────────────────────────────────────
  mainWindow.on('blur', () => {
    if (isCurrentlyRestricted) {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-blur');
      }
      setImmediate(() => snapBack());
    }
  });

  // ── Focus regained ───────────────────────────────────────────────────────────
  mainWindow.on('focus', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus');
    }
  });

  applyRestriction();
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC handlers
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('set-restriction-mode', (event, isUnrestricted) => {
  if (isUnrestricted) {
    applyUnrestriction();
  } else {
    applyRestriction();
  }
});

ipcMain.on('quit-app', () => {
  isCurrentlyRestricted = false;
  stopKeyboardHook();
  stopGuardian();
  app.quit();
});

ipcMain.handle('get-screen-capture', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 960, height: 540 },
      fetchWindowIcons: false,
    });
    if (sources.length > 0) {
      const primary =
        sources.find(s =>
          s.name.toLowerCase().includes('screen 1') ||
          s.name.toLowerCase().includes('entire screen') ||
          s.id.startsWith('screen:')
        ) || sources[0];
      const buf = primary.thumbnail.toJPEG(30);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
    return null;
  } catch (err) {
    console.error('Screen capture failed:', err);
    return null;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// App lifecycle
// ─────────────────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', event => event.preventDefault());
});

app.on('will-quit', () => {
  stopKeyboardHook();
  stopGuardian();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
