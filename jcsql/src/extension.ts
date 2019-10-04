// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path';
import { window, commands, ExtensionContext } from 'vscode';
// import { showQuickPick, showInputBox } from './basicInput';
// import { multiStepInput } from './input';
// import { quickOpen } from './quickOpen';

function check_pass_file() {

	if (fs.existsSync(path.join(__dirname, "pass"))) {
		return
	} else {
		fs.writeFile(path.join(__dirname, "pass"), '', (err) => { if (err) console.log(err) })
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	check_pass_file()


	let exec = vscode.commands.registerCommand('extension.runCode', async () => {
		// The code you place here will be executed every time your command is executed
		const enviroments = ['a','b']
		const value = await vscode.window.showQuickPick(enviroments, { placeHolder: 'Select the environment to run code' });

		// Display a message box to the user
		vscode.window.showInformationMessage(`Hello ${value}!`);
	});

	context.subscriptions.push(exec);
}

// this method is called when your extension is deactivated
export function deactivate() { }
