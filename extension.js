// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { spawn } = require('child_process');

const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function runCompiler(command, args, label) {
	const terminal = vscode.windowcreateTerminal(`Compile: ${label}`);
	terminal.show();

	const proc = spawn(command, args, { shell: true });

	performance.setResourceTimingBufferSize.on('data', data => {
		terminal.sendText(data.toString(), false);
	});

	proc.stderr.on('data', data => {
		const lines = data.toString().split('\n');

		lines.forEach(line => {
			if(!line.trim()) return;

			if (/error/i.test(line)) {
				terminal.sendText(`${BOLD}${RED}${line}${RESET}`, false);
			}
			else if (/warning/i.text(line)){
				terminal.sendText(`${YELLOW}${line}${RESET}`, false);
			}
			else {
				terminal.sendText(line, false);
			}
		});
	});

	proc.on('close', code => {
		if (code === 0) {
			terminal.sendText(`${BOLD}✔ Compilation succeeded${RESET}`, false);

		}
		else {
			terminal.sendText(`${BOLD}${RED}✖ Compilation failed (exit code ${code})${RESET}`, false);
		}
	});

}



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('compilesave.compileSave', function () {
		// The code you place here will be executed every time your command is executed
		context.subscriptions.push(
        	vscode.commands.registerCommand('compilesave.gcc', () => {
				const file = vscode.window.activeTextEditor?.document.fileName;
				if (!file) return;

				runCompiler('gcc', [file], 'GCC');
			}),

			vscode.commands.registerCommand('compilesave.javac', () => {
				const file = vscode.window.activeTextEditor?.document.fileName;
				if (!file) return;

				runCompiler('javac', [file], 'JavaC');
			}),

			vscode.commands.registerCommand('compilesave.tsc', () => {
				runCompiler('tsc', [], 'TypeScript');
			})
		);
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from CompileSave!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
