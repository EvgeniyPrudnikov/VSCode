// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import ConnectionStore from './connections'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let connStore = ConnectionStore.getInstance(context.extensionPath)

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.addConnection', () => {
			connStore.addConnection()
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('extension.showConnections', () => {
			vscode.window.showInformationMessage(connStore.getAllConnectionNames().toString())
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.runCode', async () => {
			// The code you place here will be executed every time your command is executed
			// const enviroments:Array<string> = connStore.getAllConnectionNames()
			const value = await vscode.window.showQuickPick(connStore.getAllConnectionNames(), { placeHolder: 'Select the environment to run code' });

			// Display a message box to the user
			vscode.window.showInformationMessage(`Hello ${value}!`);
		})
	);

}

// this method is called when your extension is deactivated
export function deactivate() {
}
