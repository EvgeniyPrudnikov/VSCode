
import * as vscode from 'vscode';
import * as path from 'path';
import { ConnValue } from './ConnectionStore';
import { TypedEvent } from './TypedEvent';
import * as cp from 'child_process';


interface Query {

    qyeryText: string;
    queryType: string;
}

class QueryParser {

    private queryRawText: string;
    private queryType: string;


    constructor(queryRawText: string, queryType?: string) {
        this.queryRawText = queryRawText;
        this.queryType = '';
    }
}

interface Data {
    data: string;
    state: string & 'new' | 'old';
}

class Executer {

    private clientName: string = 'Client.py';
    private resource = 'resources';
    private pyResources = 'pyResources';
    private connString: string;
    private query: Query;
    private executer: cp.ChildProcess;
    private data: string = '';


    constructor(extensionPath: string, conn: ConnValue, query: Query) {
        this.connString = conn.connString.replace('{UID}', conn.connUser).replace('{PWD}', conn.connPass);
        this.query = query;

        let pythonPath = String(vscode.workspace.getConfiguration('python', null).get('pythonPath'));

        this.executer = cp.spawn(pythonPath, ['-u', '-i', this.getClientPath(extensionPath), conn.connEnv, 'DSN=oracle_odbc;UID=e_prudnikov;PWD=S2hUdYTnR3HFwtnPLUW2', query.qyeryText, query.queryType]);

        this.executer.stdout.on('data', async (data: Buffer) => {
            try {
                this.data += data.toString();
                console.log(data.toString());
            } catch (err) {
                console.log(err);
            }
        });

    }

    private getClientPath(extensionPath: string) {
        return path.join(extensionPath, this.resource, this.pyResources, this.clientName);
    }

    public fethData(msg: string) {
        // clear data before get more
        let buf = Buffer.from(msg);
        this.data = '';
        if (this.executer) {
            this.executer.stdin.write(buf);
        }
    }



    public getData() {
        // wait for data arive
        let obj = this;
        let promise = new Promise<string>(function (resolve) {
            setTimeout(function waitData(lData) {
                if (lData.includes('Fetched')) {
                    resolve(lData);
                } else {
                    setTimeout(waitData, 50, obj.data);
                }
            }, 50, obj.data);
        });
        return promise;
    }
}

class Visualizer {

    private showTextEditorInstance!: vscode.TextEditor;
    private openSideBySideDirectionInit: any | undefined;
    public loadData: TypedEvent<string> = new TypedEvent<string>();
    private lastLine: number = 0;

    private constructor() { }

    public static Create = async () => {
        const viz = new Visualizer();
        let doc = await vscode.workspace.openTextDocument();
        await viz.switch('down');
        let show = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two & vscode.ViewColumn.Beside, false);
        await viz.switch('restore');
        viz.showTextEditorInstance = show;

        vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            if (event.textEditor.document === viz.showTextEditorInstance.document) {
                let lastVisibleLine = event.visibleRanges[0].end.line;
                let isClosed = event.textEditor.document.isClosed;

                if ((lastVisibleLine > 0) && (viz.lastLine === lastVisibleLine) && !isClosed) {
                    viz.loadData.emit('load:100');
                }
            }
        });

        return viz;
    }

    private async switch(dir: string & 'down' | 'restore') {
        let workbenchConfig = vscode.workspace.getConfiguration('workbench.editor');
        let openSideBySideDirection = workbenchConfig.get('openSideBySideDirection');

        switch (dir) {
            case 'down':
                this.openSideBySideDirectionInit = openSideBySideDirection;
                if (openSideBySideDirection === 'down') { return; }
                await workbenchConfig.update('openSideBySideDirection', 'down', vscode.ConfigurationTarget.Global);
                break;
            case 'restore':
                if (this.openSideBySideDirectionInit === 'down') { return; }
                await workbenchConfig.update('openSideBySideDirection', this.openSideBySideDirectionInit, vscode.ConfigurationTarget.Global);
            default:
                break;
        }
    }

    public async show(resultText: string) {
        let lastline = () => {
            return this.showTextEditorInstance.document.lineAt(
                this.showTextEditorInstance.document.lineCount - 1).lineNumber;
        };

        await this.switch('down');
        await this.showTextEditorInstance.edit((edit) => edit.insert(new vscode.Position(0, 0), resultText));
        this.lastLine = lastline();
        await this.switch('restore');
    }
}

export default class QueryExecuter {

    private usedConnection: ConnValue;
    private queryRawText: string = '';
    private extensionPath: string;

    constructor(connection: ConnValue, extensionPath: string) {
        this.usedConnection = connection;
        this.extensionPath = extensionPath;
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            this.queryRawText = document.getText(selection);
        }
    }


    public async RunQuery() {

        let query: Query = { qyeryText: "select * from lool__1 where rownum < 1000 order by id", queryType: 'query' };
        let exec = new Executer(this.extensionPath, this.usedConnection, query);
        let lol = await Visualizer.Create();

        let pop = await exec.getData();
        lol.show(pop);

        lol.loadData.on(async (msg) => {
            try {
                console.log(msg);
                exec.fethData(msg);
            } catch (err) {
                console.log(err);
            }
        });


    }
}
