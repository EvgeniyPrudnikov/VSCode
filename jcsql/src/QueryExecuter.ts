
import * as vscode from 'vscode';
import { ConnValue } from './ConnectionStore'

export default class QueryExecuter {

    private _usedConnection: ConnValue;
    private _queryRawText: string = ''

    constructor(connection: ConnValue) {
        this._usedConnection = connection
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            this._queryRawText = document.getText(selection)
        }
    }

    private _processQueryText() {
        return this._queryRawText.trim()

    }

    public RunQuery() {
        let queryToExecite = this._processQueryText()
        vscode.window.showInformationMessage(queryToExecite)
    }
}