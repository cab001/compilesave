// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { exec } = require('child_process');

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
    	'ttsExtension.speakSelection',
    	() => {
      	const editor = vscode.window.activeTextEditor;
      	if (!editor) return;

    	const text = editor.document.getText(editor.selection);
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
  if (!text) return;

  let command;

  if (process.platform === 'darwin') {
    command = `say "${text.replace(/"/g, '\\"')}"`;
  } else if (process.platform === 'win32') {
    command = `powershell -Command "Add-Type -AssemblyName System.Speech; `
      + `(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`
  } else {
    command = `espeak "${text.replace(/"/g, '\\"')}"`;
  }

  exec(command);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
