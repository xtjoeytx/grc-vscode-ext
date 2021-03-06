import * as grc from '@xtjoeytx/node-grc';
import * as vscode from 'vscode';
import { VSCodeContext } from "../VSCodeContext";
import { ServerlistNode } from "./ServerListNode";
import { ServerListProvider, ServerListView } from './ServerListView';

export class ServerList implements ServerListProvider {
	private serverListView: ServerListView;

	constructor(private readonly context: VSCodeContext) {
		this.serverListView = new ServerListView(context.vsContext, this);
	}

	connectToServer(server: grc.ServerEntry): void {
		let confirmMsg = `Please confirm connecting to ${server.name}.`;
		if (this.context.rcSession) {
			confirmMsg += ` This will disconnect you from your current session on ${this.context.rcSession.server.name}`;
		}

		vscode.window.showInformationMessage(confirmMsg, ...["Yes", "No"])
		.then((answer) => {
			if (answer === "Yes") {
				this.context.connectRemoteControl(server);
			}
		});
	}

	getServerList(): Thenable<ServerlistNode[]> {
		return grc.Serverlist.request(this.context.config).then((servers) => {
			const serverListData = ServerListView.getDefaultRootNodes();

			for (const server of servers) {
				serverListData[server.category].children?.push({
					resource: vscode.Uri.parse("serverlist:///" + server.name),
					server: server,
					label: server.name
				});
			}

			return serverListData.filter((v: ServerlistNode) => v.children && v.children.length > 0);
		}, (err) => {
			vscode.window.showErrorMessage(`Error fetching serverlist: ${err}`);
			return [];
		});
	}
}
