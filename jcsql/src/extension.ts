
import * as vscode from 'vscode';
import ConnectionStore from './ConnectionStore';
import QueryExecuter from './QueryExecuter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let connStore = ConnectionStore.getInstance(context.extensionPath);

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.addConnection', () => {
            connStore.addConnection();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.deleteConnection', async () => {
            const connections: Array<string> = connStore.getAllConnectionNames();
            const connName = await vscode.window.showQuickPick(connections, { placeHolder: 'Select the connection to delete' });
            if (connName) {
                connStore.deleteConnection(connName);
                vscode.window.showInformationMessage(`Connection ${connName} has been deleted`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.runCode', async () => {
            // The code you place here will be executed every time your command is executed
            const connections: Array<string> = connStore.getAllConnectionNames();
            const value = await vscode.window.showQuickPick(connections, { placeHolder: 'Select the connection to run code' });
            if (value) {
                let conn = connStore.getConnection(value);
                let exec = new QueryExecuter(conn);
                exec.RunQuery();
            }
        })
    );
}

// this method is called when your extension is deactivated
export function deactivate() { }
