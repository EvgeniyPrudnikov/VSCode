
import * as vscode from 'vscode';
import { ConnValue } from './ConnectionStore';
import { TypedEvent } from './TypedEvent';
import {PythonShell} from 'python-shell';


interface Query {

    qyeryText:string;
    queryType:string;
}

class QueryParser {

    private queryRawText:string;
    private queryType:string;


    constructor(queryRawText: string, queryType?:string) {
        this.queryRawText = queryRawText;
        this.queryType = '';
    }
}

class Executer {


    constructor (conn:ConnValue, query:Query ) {

    }

    private runPyExec() {

    }

    private sendMessage (msg:string) {

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

                if ((lastVisibleLine > 0) && (viz.lastLine === lastVisibleLine)) {
                    viz.loadData.emit('load');
                    console.log('EVENT!');
                    console.log('lastVisibleLine = ' + lastVisibleLine);
                    console.log('viz.lastLine = ' + viz.lastLine);
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
        await this.showTextEditorInstance.edit((edit) => edit.insert(new vscode.Position(lastline(), 0), resultText));
        this.lastLine = lastline();
        await this.switch('restore');
    }
}

export default class QueryExecuter {

    private usedConnection: ConnValue;
    private queryRawText: string = '';

    constructor(connection: ConnValue) {
        this.usedConnection = connection;
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            this.queryRawText = document.getText(selection);
        }
    }

    private genData(x:number) {
        let res: string = '';
        for (let i = 0 + x; i < 50 + x; i++) {
            res += `${i}\t-\trow\n`;
        }
        return res;
    }


    public async RunQuery() {
        let lol = await Visualizer.Create();
        await lol.show(this.genData(0));

        lol.loadData.on( async () => {
            await lol.show(this.genData(50));
        });
    }
}