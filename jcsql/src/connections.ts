// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path';
import { window, commands, ExtensionContext } from 'vscode';



class Connection {

	private _connFile = 'connection.html'
	private _connJSFiles = 'main.js'
	private _resource = 'resources'

	connName: string = ''
	connUser: string = ''
	connPass: string = ''
	connString: string = ''

	public static readonly viewType = 'Connection';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];


	constructor(extensionPath: string) {

		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		this._panel = vscode.window.createWebviewPanel(
			Connection.viewType,
			Connection.viewType,
			column || vscode.ViewColumn.Two,
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `resources` directory.
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'resources'))]
			}
		);;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'send':
						vscode.window.showInformationMessage(message.text);
						console.log(message.text)
						return;
				}
			},
			null,
			this._disposables
		);
	}


	public dispose() {

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		// Vary the webview's content based on where it is located in the editor.
		switch (this._panel.viewColumn) {
			case vscode.ViewColumn.Two:
			default:
				this._updateForCat(webview);
				return;
		}
	}

	private _updateForCat(webview: vscode.Webview) {
		this._panel.title = 'Connection';
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, this._resource, this._connJSFiles)
		);
		const htmlPathOnDisk = path.join(this._extensionPath, this._resource, this._connFile)
		const stylePathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, this._resource, 'style.css')
		);

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
		const styleUri = webview.asWebviewUri(stylePathOnDisk);
		

		var html: string = '';
		// First I want to read the file	
		let nonce = this._getNonce()

		html = fs.readFileSync(htmlPathOnDisk.toString()).toString();
		let res = html.replace('${scriptUri}', scriptUri.toString()).replace(/\${nonce}/g , nonce).replace('${styleUri}', styleUri.toString())
		return res
	}

	_getNonce() {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}


export default class ConnectionStore {

	private _extensionPath: string = ''
	private _passFileName = 'pass'
	private static instance: ConnectionStore;

	private constructor(extensionPath: string) {
		this._extensionPath = extensionPath
		// check is pass file exists
		let pathFile = path.join(this._extensionPath, this._passFileName)

		if (fs.existsSync(pathFile)) {
			this.loadConnections(pathFile)
		} else {
			fs.writeFile(pathFile, 'test', { flag: 'wx' }, (err) => {
				if (err) {
					console.log(err)
				}
			})
		}
	}

	private _connectionStore: Map<string, Connection> = new Map<string, Connection>()

	static getInstance(extensionPath: string): ConnectionStore {
		if (!ConnectionStore.instance) {
			ConnectionStore.instance = new ConnectionStore(extensionPath);
		}

		return ConnectionStore.instance;
	}

	private loadConnections(connStoreUri: string) {

	}

	private flushConnections(connStoreUri: string) {

	}

	async addConnection() {
		let con = new Connection(this._extensionPath)
		while (con.connName != '') {
			this._connectionStore.set(con.connName, con)
			console.log("added")
		}
	}

	getConnection(name: string): Connection {
		return (this._connectionStore.get(name) as Connection)
	}

	getAllConnectionNames(): Array<String> {
		return Array.from(this._connectionStore.keys());
	}


}