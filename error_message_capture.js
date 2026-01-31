// extension.js
const vscode = require('vscode');

const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');

// ==========================================
// ZONE A: THE ENGINE (The Bridge to Python)
// ==========================================
function callGeminiPython(errorMessage) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, 'python', 'main.py');
        const pythonCmd = process.platform === "win32" ? "python" : "python3";

        const pyProcess = spawn(pythonCmd, [scriptPath, errorMessage]);

        let resultData = "";
        pyProcess.stdout.on('data', (chunk) => { resultData += chunk.toString(); });

        pyProcess.on('close', (code) => {
            try {
                // Receives the JSON "Package" from Python
                const parsedResult = JSON.parse(resultData);
                resolve(parsedResult);
            } catch (err) {
                reject("AI logic failed to return valid JSON");
            }
        });
    });
}

// ==========================================
// ZONE B: THE EYES (The Rule Books)
// ==========================================
const myTerminalScanner = {
    provideTerminalLinks: (context) => {
        const regex = /(error|exception|fail): .*/gi;
        const matches = [...context.line.matchAll(regex)];
        return matches.map(m => ({
            startIndex: m.index,
            length: m[0].length,
            data: m[0] 
        }));
    },
    handleTerminalLink: (link) => {
        // This is where Zone B "pings" Zone C to run the command
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
                // ZONE C CALLS ZONE A HERE!
                const aiResponse = await callGeminiPython(msg);
                vscode.window.showInformationMessage(`Gemini says: ${aiResponse.explanation}`);
            } catch (error) {
                vscode.window.showErrorMessage("Error: " + error);
            }
        });
    });

    // 2. REGISTER THE EYES (Plugging Zone B into VS Code)
    const termLink = vscode.window.registerTerminalLinkProvider(myTerminalScanner);

    // 3. CLEANUP (Adding to the garbage collector)
    context.subscriptions.push(processCmd, termLink);
}

module.exports = { activate };



// // part 3 that gets information directly from vs code 
// function activate(context) {
//     // This tells VS Code to add our "Gemini" option to the lightbulb menu
//     //--------automatic compiler things --------------------------------
//     const codeActionProvider = vscode.languages.registerCodeActionsProvider(
//         { scheme: 'file', language: '*' }, // Works for ALL languages
//         {
//             provideCodeActions(document, range, context) {
//                 // Return a "Quick Fix" for every red squiggle found under the cursor
//                 return context.diagnostics.map(diagnostic => {
//                     const action = new vscode.CodeAction(
//                         '✨ Explain with Gemini (JS)', 
//                         vscode.CodeActionKind.QuickFix
//                     );
                    
//                     // json: 
//                     action.command = {
//                         command: 'gemini.processError',
//                         title: 'Explain with Gemini',
//                         arguments: [diagnostic.message]
//                     };
//                     return action;
//                 });
//             }
//         }
//     );

//     context.subscriptions.push(codeActionProvider); 
//     //------- terminal things -----------------------------------
//     const terminalLinkProvider = vscode.window.registerTerminalLinkProvider({
//         provideTerminalLinks: (context) => {
//             // Regex to find "Error", "Exception", or "Fail" in the terminal text
//             const errorRegex = /(error|exception|fail|failed): .*/gi;
//             const matches = [...context.line.matchAll(errorRegex)];

//             return matches.map(match => ({
//                 startIndex: match.index,
//                 length: match[0].length,
//                 tooltip: 'Simplify this terminal error',
//                 data: match[0] 
//             }));
//         },
//         handleTerminalLink: (link) => {
//             // When clicked, send that text to our bridge command
//             vscode.commands.executeCommand('gemini.processError', link.data);
//         }
//     });

//     context.subscriptions.push(terminalLinkProvider);
// }



// const vscode = require('vscode');
// const { spawn } = require('child_process');
// const path = require('path');

// /**
 
// This is your "Bridge" function.
// It takes the error string and hands it to Python.*/
// function callGeminiPython(errorMessage) {
//     return new Promise((resolve, reject) => {
//         // 1. Find the path to your Python script
//         const scriptPath = path.join(__dirname, 'python', 'main.py');

//         // 2. Determine the python command based on the OS
//         const pythonCmd = process.platform === "win32" ? "python" : "python3";

//         // 3. Spawn the process and pass the error as an argument (sys.argv[1])
//         const pyProcess = spawn(pythonCmd, [scriptPath, errorMessage]);

//         let resultData = "";

//         // 4. Listen for the JSON coming back from Python's print()
//         pyProcess.stdout.on('data', (data) => {
//             resultData += data.toString();
//         });

//         // 5. Handle the finish line
//         pyProcess.on('close', (code) => {
//             if (code !== 0) {
//                 reject("Python script failed");
//                 return;
//             }
//             try {
//                 // Parse the JSON "envelope" we talked about
//                 const parsedResult = JSON.parse(resultData);
//                 resolve(parsedResult);
//             } catch (err) {
//                 reject("Could not parse JSON from Python");
//             }
//         });
//     });
// }