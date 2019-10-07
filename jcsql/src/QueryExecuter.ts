
import * as vscode from 'vscode';
import { ConnValue } from './ConnectionStore'
const odbc = require('odbc');


class Execution {

    private _conn: ConnValue
    constructor(connection: ConnValue) {
        this._conn = connection
    }

    private async connecToDB(connection: ConnValue) {
        let connStr = 'DSN='
        let conn = await odbc.connect('DSN=')
    }

    public execQuery() {
        return JSON.parse('[    [        "asd",        {            "connName": "asd",            "connString": "asd",            "connEnv": "impala",            "connUser": "asd",            "connPass": "asd"        }    ],    [        "asd",        {            "connName": "asd",            "connString": "asd",            "connEnv": "impala",            "connUser": "asd",            "connPass": "asd"        }    ]]')
    }

}


export default class QueryExecuter {

    private _usedConnection: ConnValue;
    private _queryRawText: string = ''
    private _exec: Execution;

    constructor(connection: ConnValue) {
        this._usedConnection = connection
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            this._queryRawText = document.getText(selection)
        }
        this._exec = new Execution(connection)
    }

    private _processQueryText() {
        return this._queryRawText.trim()

    }

    public async RunQuery() {

        let queryToExecite = this._processQueryText()
        // let quryResult = this._exec.execQuery()

        let doc = await vscode.workspace.openTextDocument()
        const workbenchConfig = vscode.workspace.getConfiguration('openSideBySideDirection')
        workbenchConfig.update('openSideBySideDirection', 'down')

        let show = await vscode.window.showTextDocument(doc, 2, false)
        // workbench.editor.openSideBySideDirection: right | down
        await show.edit((edit) => edit.insert(new vscode.Position(0, 0), queryToExecite))

    }
}