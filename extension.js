const vscode = require('vscode');
const path = require('path');
const http = require('http');
const https = require('https');

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

    context.subscriptions.push(
        processCmd,
        termLink,
        codeActionProvider
    );
}

function deactivate() {}

module.exports = { activate, deactivate };

