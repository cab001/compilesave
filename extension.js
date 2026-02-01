const vscode = require('vscode');
const { spawn, exec } = require('child_process');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');

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
 * // at param {vscode.ExtensionContext} context
 */

// ==========================================
// ZONE A: THE ENGINE (Server → Gemini)
// ==========================================
async function callGemini(errorMessage) {
    const cfg = vscode.workspace.getConfiguration('gemini');
    const serverUrl =
        cfg.get('serverUrl') ||
        'https://server-compilesafe.vercel.app/api/explain';

    const urlObj = new URL(serverUrl);
    // const body = JSON.stringify({ message: String(errorMessage || '') });
    const body = JSON.stringify({message:'BADHSJKDHJKSHDJKAHSDJKHASJKDHAKSDHAJK'})

    const transport = urlObj.protocol === 'http:' ? http : https;

    const options = {
        method: 'POST',
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 10000
    };

    if (urlObj.port) options.port = urlObj.port;

    return new Promise((resolve, reject) => {
        const req = transport.request(options, (res) => {
            let data = '';
            console.log('Response status code:', res.statusCode);
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                console.log('Response body:', data);
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    reject('Invalid JSON from server: ' + data);
                }
            });
        });

        console.log('Request body:', body);
        console.log('Request options:', options);
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ==========================================
// ZONE B: THE EYES (Terminal Scanner)
// ==========================================
const myTerminalScanner = {
    provideTerminalLinks: (context) => {
        const regex = /(error|exception|fail|failed): .*/gi;
        return [...context.line.matchAll(regex)].map(m => ({
            startIndex: m.index,
            length: m[0].length,
            data: m[0]
        }));
    },
    handleTerminalLink: (link) => {
        vscode.commands.executeCommand('gemini.processError', link.data);
    }
};

// ==========================================
// ZONE C: THE MANAGER (Activator)
// ==========================================
function activate(context) {
    console.log('Gemini Extension active');

    const processCmd = vscode.commands.registerCommand(
        'gemini.processError',
        async (msg) => {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Gemini is simplifying…'
                },
                async () => {
                    try {
                        const aiResponse = await callGemini(msg);
                        

                        if (aiResponse?.explanation) {
                            vscode.window.showInformationMessage(
                                `Gemini: ${aiResponse.explanation}`
                            );
                        } else {
                            vscode.window.showWarningMessage(
                                'Gemini returned no explanation.'
                            );
                        }
                    } catch (err) {
                        vscode.window.showErrorMessage(
                            'Gemini error: ' + err
                        );
                    }
                }
            );
        }
    );

    const termLink =
        vscode.window.registerTerminalLinkProvider(myTerminalScanner);

    const codeActionProvider =
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: '*' },
            {
                provideCodeActions(_, __, context) {
                    return context.diagnostics.map(diagnostic => {
                        const action = new vscode.CodeAction(
                            '✨ Explain with Gemini',
                            vscode.CodeActionKind.QuickFix
                        );
                        action.command = {
                            command: 'gemini.processError',
                            title: 'Explain with Gemini',
                            arguments: [diagnostic.message]
                        };
                        return action;
                    });
                }
            }
        );

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

    context.subscriptions.push(
        processCmd,
        termLink,
        codeActionProvider
    );
}

function deactivate() {}

module.exports = { activate, deactivate };

