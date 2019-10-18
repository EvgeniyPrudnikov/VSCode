
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
    private data: Data = { data: '', state: 'new' };


    constructor(extensionPath: string, conn: ConnValue, query: Query) {
        this.connString = conn.connString.replace('{UID}', conn.connUser).replace('{PWD}', conn.connPass);
        this.query = query;
        this.connString = this.getConnStr(conn);

        let pythonPath = String(vscode.workspace.getConfiguration('python', null).get('pythonPath'));

        this.executer = cp.spawn(pythonPath, ['-u', '-i', this.getClientPath(extensionPath), conn.connEnv, this.connString, this.query.qyeryText, this.query.queryType]);
        this.executer.stdin.setDefaultEncoding('utf-8');

        this.executer.stdout.on('data', async (data: Buffer) => {
            try {
                this.data.state = 'new';
                this.data.data += data.toString();
            } catch (err) {
                console.log(err);
            }
        });

        this.executer.on('close', (code) => {
            console.log('close');

        });
        this.executer.on('exit', (code) => {
            console.log('exit');
            console.log(this.executer);
        });

    }

    private getConnStr(conn: ConnValue) {
        return conn.connString.replace('{UID}', conn.connUser).replace('{PWD}', conn.connPass);
    }

    private getClientPath(extensionPath: string) {
        return path.join(extensionPath, this.resource, this.pyResources, this.clientName);
    }

    public fethData(msg: string) {
        // clear data before get more
        this.data = { data: '', state: 'old' };

        if (this.executer) {
            this.executer.stdin.write(msg + '\n');
        }
    }

    public getData() {
        // wait for data arive
        let obj = this;
        let promise = new Promise<string>(function (resolve) {
            setTimeout(function waitData(lData) {
                if (lData.data.includes('Fetched') && lData.state === 'new') {
                    resolve(lData.data);
                } else {
                    setTimeout(waitData, 100, obj.data);
                }
            }, 100, obj.data);
        });
        return promise;
    }
}

class Visualizer {

    private textEditorInstance!: vscode.TextEditor;
    private openSideBySideDirectionInit: any | undefined;
    public loadData: TypedEvent<string> = new TypedEvent<string>();
    private lastLineNum: number = 0;
    private isReady: boolean = true;

    constructor() {


    }

    public static Create = async () => {
        const viz = new Visualizer();
        let doc = await vscode.workspace.openTextDocument();
        await viz.switch('down');
        let show = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two & vscode.ViewColumn.Beside, false);
        await viz.switch('restore');
        viz.textEditorInstance = show;


        vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            if (event.textEditor.document === viz.textEditorInstance.document) {
                let lastVisibleLineNum = event.visibleRanges[0].end.line;
                let isClosed = event.textEditor.document.isClosed;

                setTimeout(() => {
                    if ((lastVisibleLineNum > 0) && (viz.lastLineNum === lastVisibleLineNum) && !isClosed && viz.isReady) {
                        viz.loadData.emit('load:100');
                    }
                }, 500);
            }
        });

        vscode.window.onDidChangeActiveTextEditor((event) => {
            if (event === viz.textEditorInstance) {

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
        this.isReady = false;
        let lastline = () => {
            return this.textEditorInstance.document.lineAt(
                this.textEditorInstance.document.lineCount - 1);
        };

        let textRange = new vscode.Range(0, 0, lastline().range.end.line, lastline().range.end.character);

        await this.switch('down');
        await this.textEditorInstance.edit(edit => {
            edit.delete(textRange);
            edit.insert(new vscode.Position(0, 0), resultText);
        });

        this.lastLineNum = lastline().lineNumber;
        await this.switch('restore');
        this.isReady = true;
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

        let query: Query = { qyeryText: "select * from lool__1 where rownum < 10 order by id", queryType: 'query' };
        let exec = new Executer(this.extensionPath, this.usedConnection, query);
        let visualizer = await Visualizer.Create();

        let pop = await exec.getData();
        await visualizer.show(pop);

        visualizer.loadData.on(async (msg) => {
            try {
                exec.fethData(msg);
                let pop = await exec.getData();
                await visualizer.show(pop);
            } catch (err) {
                console.log(err);
            }
        });
    }
}
