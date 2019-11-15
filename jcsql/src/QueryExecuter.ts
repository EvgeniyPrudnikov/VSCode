
import * as vscode from 'vscode';
import * as path from 'path';
import { ConnValue } from './ConnectionStore';
import { TypedEvent } from './TypedEvent';
import * as cp from 'child_process';




interface IQuery {

    queryText: string;
    queryType: string;
}

class QueryParser {

    private query: IQuery;

    public getQuery() {
        return this.query;
    }

    constructor(env: string, queryRawText: string, queryType?: string) {
        this.query = this.parse(env, queryRawText, queryType);
    }


    private parse(env: string, s: string, queryType?: string): IQuery {
        let q: IQuery;
        const ls = s.trim();

        if (queryType === 'explain') {
            if (env === 'oracle') {
                q = { queryText: 'EXPLAIN PLAN FOR\n' + ls, queryType: queryType };
            } else {
                q = { queryText: 'EXPLAIN\n' + ls, queryType: queryType };
            }
            return q;
        }

        if (ls.toLowerCase().startsWith('select') || ls.toLowerCase().startsWith('with')) {
            q = { queryText: ls, queryType: 'query' };
        } else {
            q = { queryText: ls, queryType: 'script' };
        }

        return q;
    }
}

interface IData {
    data: string;
    state: string & 'new' | 'old';
}

class Executer {

    private readonly clientName: string = 'Client.py';
    private readonly resource: string = 'resources';
    private readonly pyResources: string = 'pyResources';
    private connString: string;
    private query: IQuery;
    private executer: cp.ChildProcess;
    private data: IData = { data: '', state: 'new' };
    private exitCode: number = -1;


    constructor(extensionPath: string, conn: ConnValue, query: IQuery) {

        this.query = query;
        this.connString = this.getConnStr(conn);

        const pythonPath = String(vscode.workspace.getConfiguration('python', null).get('pythonPath'));

        this.executer = cp.spawn(pythonPath, ['-u', '-i', this.getClientPath(extensionPath), conn.connEnv, this.connString, this.query.queryText, this.query.queryType]);
        this.executer.stdin.setDefaultEncoding('utf-8');

        this.executer.stdout.on('data', (data: Buffer) => {
            this.data.state = 'new';
            this.data.data += data.toString();
        });

        this.executer.on('close', (code) => {
            console.log(`child process closed with code ${code}`);
            this.exitCode = code;
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

        if (this.exitCode >= 0) { // process finished
            return false;
        }
        this.executer.stdin.write(msg + '\n');
        return true;
    }

    public getData() {
        // wait for data arive
        const obj = this;
        const promise = new Promise<string>(function (resolve) {
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

    private constructor() { }

    public static Create = async () => {
        const viz = new Visualizer();
        const doc = await vscode.workspace.openTextDocument();
        await viz.switch('down');
        const show = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two & vscode.ViewColumn.Beside, false);
        await viz.switch('restore');
        viz.textEditorInstance = show;

        vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            if (event.textEditor.document === viz.textEditorInstance.document) {
                const lastVisibleLineNum = event.visibleRanges[0].end.line;
                const isClosed = event.textEditor.document.isClosed;

                setTimeout(() => {
                    if ((lastVisibleLineNum > 0) && (viz.lastLineNum === lastVisibleLineNum) && !isClosed && viz.isReady) {
                        viz.loadData.emit('load:100');
                        viz.isReady = false;
                    }
                }, 200);
            }
        });
        return viz;
    }

    private async switch(dir: string & 'down' | 'restore') {
        const workbenchConfig = vscode.workspace.getConfiguration('workbench.editor');
        const openSideBySideDirection = workbenchConfig.get('openSideBySideDirection');

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

        const lastline = () => {
            return this.textEditorInstance.document.lineAt(
                this.textEditorInstance.document.lineCount - 1);
        };

        const textRange = new vscode.Range(0, 0, lastline().range.end.line, lastline().range.end.character);

        await this.textEditorInstance.edit(edit => {
            edit.delete(textRange);
            edit.insert(new vscode.Position(0, 0), resultText);
        });

        this.lastLineNum = lastline().lineNumber;
        this.isReady = true;
    }

    public async append(resultText: string) {

        await this.textEditorInstance.edit(edit => {
            edit.insert(new vscode.Position(this.lastLineNum, 0), resultText);
        });

        this.lastLineNum = this.textEditorInstance.document.lineAt(this.textEditorInstance.document.lineCount - 1).lineNumber;
        this.isReady = true;
    }
}

export default class QueryExecuter {

    private usedConnection: ConnValue;
    private queryRawText: string = '';
    private queryType: string = '';
    private extensionPath: string;

    constructor(connection: ConnValue, extensionPath: string, qType?:string) {
        this.usedConnection = connection;
        this.extensionPath = extensionPath;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            let selection = editor.selection;
            if (selection.isEmpty) {
                const currLine = editor.selection.active.line;
                const stratPos = new vscode.Position(currLine, 0);
                const endPos = document.lineAt(currLine).range.end;
                selection = new vscode.Selection(stratPos, endPos);
                editor.selection = selection;
            }
            this.queryRawText = document.getText(selection);
        }
        if (qType) {
            this.queryType = qType;
        }
    }


    public async RunQuery() {

        if (!this.queryRawText.trim()) {
            return;
        }

        const query: IQuery = new QueryParser(this.usedConnection.connEnv, this.queryRawText, this.queryType).getQuery();
        const exec: Executer = new Executer(this.extensionPath, this.usedConnection, query);
        const visualizer: Visualizer = await Visualizer.Create();

        visualizer.show('\n' + query.queryText + '\n');

        let pop = await exec.getData();
        pop = query.queryText + '\n\n' + pop;
        visualizer.show(pop);

        visualizer.loadData.on(async function display(msg) {
            try {
                let connected = exec.fethData(msg);
                if (!connected) {
                    await visualizer.append('Done.');
                    visualizer.loadData.off(display);
                    return;
                }
                let pop = await exec.getData();
                pop = query.queryText + '\n\n' + pop;
                visualizer.show(pop);
            } catch (err) {
                console.log(err);
            }
        });
    }
}
