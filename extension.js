// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { exec } = require('child_process');
const os = require('os');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand(
    	'tts.speakClipboard',
    	async () => {
      	const text = await vscode.env.clipboard.readText();

      	if (!text) {
        	vscode.window.showWarningMessage('Clipboard is empty');
        	return;
      	}

      	speak(text);
    	}
  		),

		vscode.commands.registerCommand('compilesave.compileSave', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from CompileSave!');
		}
		)
	);

}

function speak(text) {
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

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
