
import * as vscode from 'vscode';
import { ConnValue } from './ConnectionStore'
const odbc = require('odbc');


class Execution {

    private _conn: ConnValue
    constructor(connection: ConnValue) {
        this._conn = connection
    }

    public queryResult: any | undefined

    private async connecToDB() {
        let connStr = 'DSN=impala_odbc'
        return await odbc.connect(connStr)
    }

    public async execQuery() {
        let conn = await this.connecToDB()
        let result = await conn.query("select 1 as value , 'asd' as lol union all select 3 as value , 'dsa' as lol ");
        console.log(result)
        this.queryResult = result
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
        await this._exec.execQuery()
        let quryResult = this._exec.queryResult



        let doc = await vscode.workspace.openTextDocument()
        const workbenchConfig = vscode.workspace.getConfiguration('openSideBySideDirection')
        workbenchConfig.update('openSideBySideDirection', 'down')

        let show = await vscode.window.showTextDocument(doc, 2, false)
        // workbench.editor.openSideBySideDirection: right | down
        await show.edit((edit) => edit.insert(new vscode.Position(0, 0), quryResult))
    }
}