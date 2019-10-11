
import * as vscode from 'vscode';
import { ConnValue } from './ConnectionStore';


class QueryParser {

    constructor(queryRawText: string) {
    }
}


class Visualizer {

    private showTextEditorInstance!: vscode.TextEditor;
    private openSideBySideDirectionInit: any | undefined;
    private constructor() { }

    public static Create = async () => {
        const viz = new Visualizer();
        let doc = await vscode.workspace.openTextDocument();
        await viz.switch('down');
        let show = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Two & vscode.ViewColumn.Beside, false);
        await viz.switch('restore');
        viz.showTextEditorInstance = show;

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
        let lastline = this.showTextEditorInstance.document.lineAt(
            this.showTextEditorInstance.document.lineCount - 1).lineNumber;

        await this.switch('down');
        await this.showTextEditorInstance.edit((edit) => edit.insert(new vscode.Position(lastline, 0), resultText));
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

    public async RunQuery() {
        let lol = await Visualizer.Create();
        await lol.show(this.queryRawText);
    }
}