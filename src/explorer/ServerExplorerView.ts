import path = require('path');
import * as vscode from 'vscode';
import * as types from './types';

function getResourceContextValue(v: types.ResourceType): string | undefined {
	switch (v) {
		case types.ResourceType.file: return "file";
		case types.ResourceType.folder: return "folder";
		case types.ResourceType.npcs: return "npcs";
		case types.ResourceType.scripts: return "scripts";
		case types.ResourceType.weapons: return "weapons";
	}
}

export interface ServerExplorerProvider {
	/**
	 * Retrieve a list of nodes below this resource
	 * 
	 * @param resource 
	 */
	getChildrenNodes(resource: vscode.Uri): vscode.ProviderResult<types.GTreeNode[]>;

	/**
	 * Requests a resource from the server explorer. This can be used
	 * to refresh sub-resources, or request an editor for the resource which
	 * may be followed by an additional getResource(resource) call for the content
	 * 
	 * @param resource 
	 */
	getResource(resource: vscode.Uri): void;

	/**
	 * Requests a resource from the server explorer. This can be used
	 * to refresh sub-resources, or request an editor for the resource which
	 * may be followed by an additional getResourceContent(resource) call for the content
	 * 
	 * @param resource 
	 * @returns Uint8Array | Thenable<Uint8Array>
	 */
	getResourceContent(resource: vscode.Uri): types.PromiseFn<Uint8Array> | undefined

	/**
	 * Requests a resource from the server explorer. This can be used
	 * to refresh sub-resources, or request an editor for the resource which
	 * may be followed by an additional getResourceContent(resource) call for the content
	 * 
	 * @param resource 
	 * @returns Uint8Array | Thenable<Uint8Array>
	 */
	putRequestContent(resource: vscode.Uri, content: Uint8Array): boolean
}

class ServerExplorerTreeDataProvider implements vscode.TreeDataProvider<types.GTreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

	constructor(private readonly dataProvider: ServerExplorerProvider) {

	}
	
	getTreeItem(element: types.GTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return {
			resourceUri: element.resource,
			label: element.label,
			collapsibleState: element.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : void 0,
			command: element.isDirectory ? void 0 : {
				command: 'serverExplorerView.openResource',
				arguments: [element.resource],
				title: 'Open Resource'
			},
			iconPath: {
				light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
				dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
			},
			contextValue: getResourceContextValue(element.type)
		};
	}

	getChildren(element?: types.GTreeNode): vscode.ProviderResult<types.GTreeNode[]> {
		const uri = element?.resource || vscode.Uri.parse('');
		return this.dataProvider.getChildrenNodes(uri);

		// return element ? this.dataProvider.getChildren(element) : this.dataProvider.roots;
	}
	
	refresh(): any {
		this._onDidChangeTreeData.fire(undefined);
	}
}

export class ServerExplorerView {
	private treeView: vscode.TreeView<types.GTreeNode>;
	private treeDataProvider: ServerExplorerTreeDataProvider;

	constructor(context: vscode.ExtensionContext, provider: ServerExplorerProvider) {
		this.treeDataProvider = new ServerExplorerTreeDataProvider(provider);

		this.treeView = vscode.window.createTreeView("serverExplorerView", { treeDataProvider: this.treeDataProvider });
		
		vscode.commands.registerCommand('serverExplorerView.refresh', () => this.refresh());
		vscode.commands.registerCommand('serverExplorerView.revealResource', () => this.reveal());
		vscode.commands.registerCommand('serverExplorerView.openResource', (resource: vscode.Uri) => provider.getResource(resource.with({ query: "open" })));

		// Treeview Context-Menu Commands
		vscode.commands.registerCommand('serverExplorerView.editFlags', (node: types.GTreeNode) => provider.getResource(node.resource.with({ query: "open", path: node.resource.path + ".flags"})));
		vscode.commands.registerCommand('serverExplorerView.viewNpc', (node: types.GTreeNode) => provider.getResource(node.resource.with({ query: "open", path: node.resource.path + ".attrs"})));

		vscode.commands.registerCommand('serverExplorerView.editScript', (node: types.GTreeNode) => provider.getResource(node.resource.with({ query: "open"})));
		vscode.commands.registerCommand('serverExplorerView.deleteEntry', (node: types.GTreeNode) => provider.getResource(node.resource.with({ query: "delete"})));
	}

	public updateTitle(title: string): void {
		this.treeView.title = title;
	}

	public refresh(): void {
		this.treeDataProvider.refresh();
	}

	private reveal(): Thenable<void>|null {
		const node = this.getNode();
		if (node) {
			return this.treeView.reveal(node);
		}
		return null;
	}

	private getNode(): types.GTreeNode|null {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.uri.scheme === types.URI_SCHEME) {
				return { resource: vscode.window.activeTextEditor.document.uri, type: types.ResourceType.file, isDirectory: false };
			}
		}
		return null;
	}
}