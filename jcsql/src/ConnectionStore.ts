import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TypedEvent } from './TypedEvent';

export class ConnValue {

    connName: string;
    connString: string;
    connEnv: string;
    connUser: string;
    connPass: string;

    constructor(connName: string, connEnv: string, connUser: string, connPass: string, connString: string) {
        this.connName = connName;
        this.connEnv = connEnv;
        this.connUser = connUser;
        this.connPass = connPass;
        this.connString = this.parseConnStr(connString);
    }

    private parseConnStr = (connstr:string) => {
        return connstr.trim().replace('"','').replace("'","");
    }
}

class Connection {

    private connFile = 'connection.html';
    private connJSFiles = 'main.js';
    private style = 'style.css';
    private resource = 'resources';

    isReady = new TypedEvent<ConnValue>();

    public static readonly viewType = 'Connection';

    private readonly panel: vscode.WebviewPanel;
    private readonly extensionPath: string;
    private disposables: vscode.Disposable[] = [];


    constructor(extensionPath: string) {

        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        this.panel = vscode.window.createWebviewPanel(
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

        this.panel.title = 'Connection';
        this.extensionPath = extensionPath;

        // Set the webview's initial html content
        this.update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'send':
                        let conval: ConnValue = this.fillConVal(message.text);
                        vscode.window.showInformationMessage('Saved');
                        this.isReady.emit(conval);
                        this.sleep(500);
                        this.dispose();
                        return;
                }
            },
            null,
            this.disposables
        );
    }

    public dispose() {
        // Clean up our resources
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private sleep(delay: number) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay) {}
    }

    private update() {

        const scriptPathOnDisk = vscode.Uri.file(path.join(this.extensionPath, this.resource, this.connJSFiles));
        const htmlPathOnDisk = path.join(this.extensionPath, this.resource, this.connFile);
        const stylePathOnDisk = vscode.Uri.file(path.join(this.extensionPath, this.resource, this.style));

        const scriptUri = this.panel.webview.asWebviewUri(scriptPathOnDisk);
        const styleUri = this.panel.webview.asWebviewUri(stylePathOnDisk);

        var html: string = '';
        let nonce = this.getNonce();
        html = fs.readFileSync(htmlPathOnDisk.toString()).toString();
        html = html.replace('${scriptUri}', scriptUri.toString()).replace(/\${nonce}/g, nonce).replace('${styleUri}', styleUri.toString());
        this.panel.webview.html = html;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private fillConVal(propString: string): ConnValue {
        let splitProps = propString.split(";");
        return new ConnValue(splitProps[0], splitProps[1], splitProps[2], splitProps[3], splitProps[4]);
    }
}


export default class ConnectionStore {

    private extensionPath: string;
    private passFileName: string = 'pass';
    private pathFile: string;
    private static instance: ConnectionStore;
    private connectionStore: Map<string, ConnValue>;
    public static lastUsedConnection: ConnValue;

    private constructor(extensionPath: string) {
        this.extensionPath = extensionPath;

        this.pathFile = path.join(this.extensionPath, this.passFileName);

        // check is pass file exists
        if (fs.existsSync(this.pathFile)) {
            this.connectionStore = this.loadConnections(this.pathFile);
        } else {
            this.connectionStore = new Map<string, ConnValue>();
        }
    }

    static getInstance(extensionPath: string): ConnectionStore {
        if (!ConnectionStore.instance) {
            ConnectionStore.instance = new ConnectionStore(extensionPath);
        }
        return ConnectionStore.instance;
    }

    private loadConnections(pathFile: string) {
        let data = fs.readFileSync(pathFile);
        if (data.toString()) {
            return new Map<string, ConnValue>(JSON.parse(data.toString()));
        }
        return new Map<string, ConnValue>();
    }

    private flushConnections() {
        fs.writeFileSync(this.pathFile, JSON.stringify(Array.from(this.connectionStore.entries())), { flag: 'w' });
    }

    public addConnection() {
        let con = new Connection(this.extensionPath);
        con.isReady.once((conval) => {
            try {
                if (conval.connName) {
                    this.connectionStore.set(conval.connName, conval);
                    this.flushConnections();
                }
            } catch (error) {
                console.log(error);
            }
        });
    }

    public deleteConnection(name: string) {
        try {
            this.connectionStore.delete(name);
            this.flushConnections();
        }
        catch (err) {
            console.error(err);
        }
    }

    public getConnection(name: string): ConnValue {
        return (this.connectionStore.get(name) as ConnValue);
    }

    public getAllConnectionNames(): Array<string> {
        return Array.from(this.connectionStore.keys());
    }
}