
import * as vscode from 'vscode';
import * as path from 'path';
import { ConnValue } from './ConnectionStore';
import { TypedEvent } from './TypedEvent';
import * as cp from 'child_process';



interface IQuery {

    qyeryText: string;
    queryType: string;
}

class QueryParser {

    public query: IQuery;

    constructor(queryRawText: string, queryType?: string) {
        this.query = this.parse(queryRawText, queryType);
    }


    private parse(s: string, queryType?: string): IQuery {
        let q: IQuery;

        if (queryType) {
            q = { qyeryText: s.trim(), queryType: queryType };
            return q;
        }

        if (s.trim().startsWith('select') || s.trim().startsWith('with')) {
            q = { qyeryText: s.trim(), queryType: 'query' };
        } else {
            q = { qyeryText: s.trim(), queryType: 'script' };
        }

        return q;
    }


}

interface IData {
    data: string;
    state: string & 'new' | 'old';
}

class Executer {

    private clientName: string = 'Client.py';
    private resource = 'resources';
    private pyResources = 'pyResources';
    private connString: string;
    private query: IQuery;
    private executer: cp.ChildProcess;
    private data: IData = { data: '', state: 'new' };


    constructor(extensionPath: string, conn: ConnValue, query: IQuery) {

        this.query = query;
        this.connString = this.getConnStr(conn);

        let pythonPath = String(vscode.workspace.getConfiguration('python', null).get('pythonPath'));

        this.executer = cp.spawn(pythonPath, ['-u', '-i', this.getClientPath(extensionPath), conn.connEnv, this.connString, this.query.qyeryText, this.query.queryType]);
        this.executer.stdin.setDefaultEncoding('utf-8');

        this.executer.stdout.on('data', (data: Buffer) => {
            this.data.state = 'new';
            this.data.data += data.toString();
        });

        this.executer.stderr.on('data', (data: Buffer) => {
            let dataStr = data.toString();
            if (dataStr.includes('SystemExit: 0')) {
                this.executer.kill();
            }
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

        if (!this.executer.killed) {
            this.executer.stdin.write(msg + '\n');
            return true;
        }

        return false;
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

    private constructor() { }

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
                        viz.isReady = false;
                    }
                }, 200);
            }
        });
<<<<<<< HEAD

=======
>>>>>>> 844f2cb70f776bd2871f321c7530b15b9fcd24f1
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

<<<<<<< HEAD
        // let query: IQuery = new QueryParser(this.queryRawText).query;
        let query: IQuery = { qyeryText:'EXPLAIN PLAN FOR select * from dual', queryType:'explain'};

=======
        let query: Query = { qyeryText: "select * from lool__1 where rownum <= 200 order by id", queryType: 'query' };
>>>>>>> 844f2cb70f776bd2871f321c7530b15b9fcd24f1
        let exec = new Executer(this.extensionPath, this.usedConnection, query);
        let visualizer = await Visualizer.Create();

        let pop = await exec.getData();
        await visualizer.show(pop);

        visualizer.loadData.on(async function display(msg) {
            try {
                let connected = exec.fethData(msg);
                if (!connected) {
                    visualizer.loadData.off(display);
                    return;
                }
                let pop = await exec.getData();
                await visualizer.show(pop);
            } catch (err) {
                console.log(err);
            }
        });

    }
}
