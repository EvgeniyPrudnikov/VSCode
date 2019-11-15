
import * as vscode from 'vscode';
import ConnectionStore, { ConnValue } from './ConnectionStore';
import QueryExecuter from './QueryExecuter';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const connStore = ConnectionStore.getInstance(context.extensionPath);

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
            const conn = connStore.getLastUsedConnection();
            vscode.commands.executeCommand('extension.runCodeIn', conn);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.runCodeIn', async (conn?: ConnValue) => {
            if (conn) {
                const exec = new QueryExecuter(conn, context.extensionPath);
                exec.RunQuery();
            }
            else {
                const connectionNames: Array<string> = connStore.getAllConnectionNames();
                const connectionName = await vscode.window.showQuickPick(connectionNames, { placeHolder: 'Select the connection to run code' });
                if (connectionName) {
                    const conn = connStore.getConnection(connectionName);
                    connStore.updateLastUsedConnection(conn);
                    const exec = new QueryExecuter(conn, context.extensionPath);
                    exec.RunQuery();
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.explainPlan', async () => {
            // The code you place here will be executed every time your command is executed
            const connections: Array<string> = connStore.getAllConnectionNames();
            const value = await vscode.window.showQuickPick(connections, { placeHolder: 'Select the connection for explain plan' });
            if (value) {
                const conn = connStore.getConnection(value);
                const exec = new QueryExecuter(conn, context.extensionPath, 'explain');
                exec.RunQuery();
            }
        })
    );
}

// this method is called when your extension is deactivated
export function deactivate() { }
