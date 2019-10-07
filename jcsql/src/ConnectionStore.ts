// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path';
import { TypedEvent } from './TypedEvent';

export class ConnValue {

    connName: string = ''
    connString: string = ''
    connEnv: string = ''
    connUser: string = ''
    connPass: string = ''

    constructor(connName: string, connEnv: string, connUser: string, connPass: string, connString: string) {
        this.connName = connName
        this.connEnv = connEnv
        this.connUser = connUser
        this.connPass = connPass
        this.connString = connString
    }
}

class Connection {

    private _connFile = 'connection.html'
    private _connJSFiles = 'main.js'
    private _style = 'style.css'
    private _resource = 'resources'

    isReady = new TypedEvent<ConnValue>();

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
        );

        this._panel.title = 'Connection';
        this._extensionPath = extensionPath;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'send':
                        let conval: ConnValue = this._fillProps(message.text)
                        vscode.window.showInformationMessage('Saved')
                        this.isReady.emit(conval)
                        this.sleep(500)
                        this.dispose()
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

    private sleep(delay: number) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay);
    }

    private _update() {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, this._resource, this._connJSFiles));
        const htmlPathOnDisk = path.join(this._extensionPath, this._resource, this._connFile)
        const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, this._resource, this._style));

        // And the uri we use to load this script in the webview
        const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);
        const styleUri = this._panel.webview.asWebviewUri(stylePathOnDisk);

        var html: string = '';
        let nonce = this._getNonce()
        html = fs.readFileSync(htmlPathOnDisk.toString()).toString();
        let res = html.replace('${scriptUri}', scriptUri.toString()).replace(/\${nonce}/g, nonce).replace('${styleUri}', styleUri.toString())
        this._panel.webview.html = res
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _fillProps(propString: string): ConnValue {
        let splitProps = propString.split(";")
        return new ConnValue(splitProps[0], splitProps[1], splitProps[2], splitProps[3], splitProps[4])
    }
}


export default class ConnectionStore {

    private _extensionPath: string = ''
    private _passFileName: string = 'pass'
    private _pathFile: string = ''
    private static instance: ConnectionStore;
    private _connectionStore: Map<string, ConnValue>;
    public static lastUsedConnection: ConnValue;

    private constructor(extensionPath: string) {
        this._extensionPath = extensionPath

        this._pathFile = path.join(this._extensionPath, this._passFileName)

        // check is pass file exists
        if (fs.existsSync(this._pathFile)) {
            this._connectionStore = this.loadConnections(this._pathFile)
        } else {
            this._connectionStore = new Map<string, ConnValue>()
        }
    }

    static getInstance(extensionPath: string): ConnectionStore {
        if (!ConnectionStore.instance) {
            ConnectionStore.instance = new ConnectionStore(extensionPath);
        }

        return ConnectionStore.instance;
    }

    private loadConnections(pathFile: string) {
        let data = fs.readFileSync(pathFile)
        if (data.toString()) {
            return new Map<string, ConnValue>(JSON.parse(data.toString()));
        }
        return new Map<string, ConnValue>();
    }

    private flushConnections() {
        fs.writeFileSync(this._pathFile, JSON.stringify(Array.from(this._connectionStore.entries())), { flag: 'w' })
    }

    public addConnection() {
        let con = new Connection(this._extensionPath)
        con.isReady.on((conval) => {
            try {
                console.log(conval.connName);
                if (conval.connName) {
                    this._connectionStore.set(conval.connName, conval)
                    this.flushConnections()
                }
            } catch (error) {
                console.log(error);
            }
        })
    }

    public deleteConnection(name: string) {
        try {
            this._connectionStore.delete(name)
            this.flushConnections()
        }
        catch (err) {
            console.error(err)
        }
    }

    public getConnection(name: string): ConnValue {
        return (this._connectionStore.get(name) as ConnValue)
    }

    public getAllConnectionNames(): Array<string> {
        return Array.from(this._connectionStore.keys());
    }
}