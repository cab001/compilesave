const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const https = require('https');

// ==========================================
// ZONE A: THE ENGINE (The Bridge to Python)
// ==========================================
// function callGeminiLocalPython(errorMessage) {
//     return new Promise((resolve, reject) => {
//         const scriptPath = path.join(__dirname, 'python', 'main.py');
//         const pythonCmd = process.platform === "win32" ? "python" : "python3";
//         const args = [scriptPath, String(errorMessage || '')];

//         // Ensure the spawned process inherits environment variables (like GEMINI_API_KEY)
//         const pyProcess = spawn(pythonCmd, args, { env: process.env });

//         let stdout = "";
//         let stderr = "";
//         const timeoutMs = 15000; // 15s
//         const timeout = setTimeout(() => {
//             try { pyProcess.kill(); } catch (e) {}
//             reject("AI helper timed out after 15s");
//         }, timeoutMs);

//         pyProcess.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
//         pyProcess.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

//         pyProcess.on('error', (err) => {
//             clearTimeout(timeout);
//             reject("Failed to start Python process: " + err.message);
//         });

//         pyProcess.on('close', (code) => {
//             clearTimeout(timeout);
//             if (code !== 0) {
//                 reject(`Python exited with code ${code}. Stderr: ${stderr || stdout}`);
//                 return;
//             }
//             try {
//                 const parsedResult = JSON.parse(stdout);
//                 resolve(parsedResult);
//             } catch (err) {
//                 reject("AI logic failed to return valid JSON");
//             }
//         });
//     });
// } 

// Try the hosted server first, fallback to local python if server is down or misconfigured
function callGemini(errorMessage) {
    return new Promise(async (resolve, reject) => {
        const cfg = vscode.workspace.getConfiguration('gemini');
        const serverUrl = cfg.get('serverUrl') || 'https://server-compilesafe.vercel.app/api/explain';
        const useServer = cfg.get('useServer') ?? true;

        if (useServer && serverUrl) {
            try {
                const urlObj = new URL(serverUrl);
                const body = JSON.stringify({ message: String(errorMessage || '') });
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

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', async () => {
                        try {
                            if (res.statusCode >= 200 && res.statusCode < 300) {
                                const parsed = JSON.parse(data);
                                resolve(parsed);
                                return;
                            }
                        } catch (err) {
                            // parse error -> fall through to fallback
                        }
                        // server returned non-success or invalid JSON: try local
                        try {
                            const fallback = await callGeminiLocalPython(errorMessage);
                            resolve(fallback);
                        } catch (e) {
                            reject('Server failed and fallback failed: ' + (e && e.message ? e.message : e));
                        }
                    });
                });

                req.on('error', async (err) => {
                    try {
                        const fallback = await callGeminiLocalPython(errorMessage);
                        resolve(fallback);
                    } catch (e) {
                        reject('Server request failed and fallback failed: ' + err.message);
                    }
                });

                req.on('timeout', () => {
                    req.destroy(new Error('Request timed out'));
                });

                req.write(body);
                req.end();
                return;
            } catch (err) {
                // proceed to fallback
            }
        }

        // fallback to local python
        try {
            const res = await callGeminiLocalPython(errorMessage);
            resolve(res);
        } catch (err) {
            reject(err);
        }
    });
}

// ==========================================
// ZONE B: THE EYES (The Rule Books)
// ==========================================
const myTerminalScanner = {
    provideTerminalLinks: (context) => {
        const regex = /(error|exception|fail|failed): .*/gi;
        const matches = [...context.line.matchAll(regex)];
        return matches.map(m => ({
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
// ZONE C: THE MANAGER (The Activator)
// ==========================================
function activate(context) {
    console.log("Gemini Extension is now active!");

    // 1. REGISTER THE COMMAND (The link between UI and Bridge)
    let processCmd = vscode.commands.registerCommand('gemini.processError', async (msg) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Gemini is simplifying...",
        }, async () => {
            try {
                const aiResponse = await callGemini(msg);
                if (aiResponse && aiResponse.explanation) {
                    const expl = aiResponse.explanation;
                    vscode.window.showInformationMessage(`Gemini: ${expl}`);

                    // If we detect the offline fallback, offer quick help
                    if (expl.startsWith('(Offline)')) {
                        const action = await vscode.window.showInformationMessage(
                            'Gemini helper looks offline. Need help configuring it?',
                            'Open README', 'Open launch.json'
                        );
                        if (action === 'Open README') {
                            const docUri = vscode.Uri.file(path.join(__dirname, 'docs', 'README.md'));
                            vscode.commands.executeCommand('vscode.open', docUri);
                        } else if (action === 'Open launch.json') {
                            const launchUri = vscode.Uri.file(path.join(__dirname, '.vscode', 'launch.json'));
                            vscode.commands.executeCommand('vscode.open', launchUri);
                        }
                    }

                } else {
                    vscode.window.showInformationMessage('Gemini responded, but returned no explanation.');
                }
            } catch (error) {
                vscode.window.showErrorMessage("Error: " + error);
            }
        });
    });

    // 2. REGISTER THE EYES (Plugging Zone B into VS Code)
    const termLink = vscode.window.registerTerminalLinkProvider(myTerminalScanner);

    // 2b. REGISTER A QUICK FIX (Add "Explain with Gemini" to the lightbulb)
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: 'file', language: '*' },
        {
            provideCodeActions(document, range, context) {
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

    // 3. CLEANUP (Adding to the garbage collector)
    context.subscriptions.push(processCmd, termLink, codeActionProvider);
}

function deactivate() {}

module.exports = { activate, deactivate };
