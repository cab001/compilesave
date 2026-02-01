const vscode = require('vscode');
const { spawn, exec } = require('child_process');
const os = require('os');

// ANSI color codes
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

/**
 * Creates a VS Code pseudoterminal that can render ANSI colors
 */
function createCompilerTerminal(label) {
  const writeEmitter = new vscode.EventEmitter();

  const pty = {
    onDidWrite: writeEmitter.event,
    open: () => {},
    close: () => {}
  };

  const terminal = vscode.window.createTerminal({
    name: `Compile: ${label}`,
    pty
  });

  return {
    terminal,
    write: (data) => writeEmitter.fire(data)
  };
}

/**
 * Runs a compiler and writes colored output to a pseudoterminal
 */
function runCompiler(command, args, label) {
  const { terminal, write } = createCompilerTerminal(label);
  terminal.show();

  const proc = spawn(command, args, { shell: false });

  proc.stdout.on('data', (data) => {
    write(data.toString());
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      let colored = `${line}\r\n`;

      if (/error/i.test(line)) {
        colored = `${BOLD}${RED}${line}${RESET}\r\n`;
      } else if (/warning/i.test(line)) {
        colored = `${BLUE}${line}${RESET}\r\n`;
      }

      write(colored);
    }
  });

  proc.on('close', (code) => {
    const msg =
      code === 0
        ? `${BOLD}${BLUE}✔ Compilation succeeded${RESET}\r\n`
        : `${BOLD}${RED}✖ Compilation failed (exit code ${code})${RESET}\r\n`;

    write(msg);
  });
}

/**
 * Reads text aloud using OS-native TTS
 */
function speak(text) {
  if (!text.trim()) return;

  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS
    exec(`say "${text.replace(/"/g, '\\"')}"`);
  } else if (platform === 'win32') {
    // Windows
    exec(
      `powershell -Command "Add-Type -AssemblyName System.Speech; ` +
      `(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`
    );
  } else {
    // Linux
    exec(`espeak "${text.replace(/"/g, '\\"')}"`);
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // GCC
  context.subscriptions.push(
    vscode.commands.registerCommand('compilesave.gcc', () => {
      const file = vscode.window.activeTextEditor?.document.fileName;
      if (!file) return;

      runCompiler('gcc', [file], 'GCC');
    })
  );

  // JavaC
  context.subscriptions.push(
    vscode.commands.registerCommand('compilesave.javac', () => {
      const file = vscode.window.activeTextEditor?.document.fileName;
      if (!file) return;

      runCompiler('javac', [file], 'JavaC');
    })
  );

  // TypeScript
  context.subscriptions.push(
    vscode.commands.registerCommand('compilesave.tsc', () => {
      runCompiler('tsc', [], 'TypeScript');
    })
  );

  // Speak clipboard
  context.subscriptions.push(
    vscode.commands.registerCommand('tts.speakClipboard', async () => {
      const text = await vscode.env.clipboard.readText();

      if (!text) {
        vscode.window.showWarningMessage('Clipboard is empty');
        return;
      }

      speak(text);
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
