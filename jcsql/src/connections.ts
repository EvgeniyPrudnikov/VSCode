// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path';
import { window, commands, ExtensionContext } from 'vscode';



class Connection {

	private connFileUri = '/connections.html'
	private connName:string =''
	private connUser:string =''
	private connPass:string =''
	private connString:string =''

	constructor() {
		this.showConnFile(this.connFileUri)
	}

	private showConnFile(connFileUri:string) {

	}

}

class ConnectionStore {

	private connStoreUri = '/pass'
	private static instance: ConnectionStore;

	private constructor() {
		if (fs.existsSync(this.connStoreUri)) {
			this.loadConnections(this.connStoreUri)
		} else {
			fs.writeFile(this.connStoreUri, '', (err) => { if (err) console.log(err) })
		}
	}

	private _connectionStore:Array<Connection> = []

	static getInstance(): ConnectionStore {
		if (!ConnectionStore.instance) {
			ConnectionStore.instance = new ConnectionStore();
		}

		return ConnectionStore.instance;
	}

	private loadConnections(connStoreUri:string) {

	}

	addConnection (con:Connection) {
		console.log('con added')
	}

	getConnection(name:string) {

	}

	getAllConnections() {

	}


}