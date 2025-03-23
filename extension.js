const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite'); // You'll need to add this dependency
const { parseDSPFile } = require('./utils/dspParser');
const { convertEncoding, getCurrentEncoding } = require('./utils/encoding');

/**
 * Tree data provider for VS6 projects
 */
class VS6ProjectExplorer {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._projectData = null;
        this._projectFile = null;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    async openProjectFile(filePath) {
        try {
            this._projectFile = filePath;
            this._projectData = await parseDSPFile(filePath);
            this.refresh();
            vscode.window.showInformationMessage(`Opened Visual Studio 6 project: ${this._projectData.name}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open project: ${error.message}`);
        }
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (!this._projectData) {
            return [];
        }

        // Root level - display symbolic folders first, then other categorized folders
        if (!element) {
            const rootItems = [];
            
            // Add symbolic folders first
            if (this._projectData.symbolicFolders && this._projectData.symbolicFolders.length > 0) {
                for (const folder of this._projectData.symbolicFolders) {
                    rootItems.push(new VS6ProjectItem(
                        folder.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        { folder, type: 'symbolicFolder' }
                    ));
                }
            }
            
            // Then add categorized folders if not already covered by symbolic folders
            const standardFolders = [
                { key: 'sourceFiles', name: 'Source Files', icon: 'file-code' },
                { key: 'headerFiles', name: 'Header Files', icon: 'file-submodule' },
                { key: 'resourceFiles', name: 'Resource Files', icon: 'file-media' },
                { key: 'otherFiles', name: 'Other Files', icon: 'file' }
            ];
            
            for (const folderType of standardFolders) {
                if (this._projectData[folderType.key] && this._projectData[folderType.key].length > 0) {
                    rootItems.push(new VS6ProjectItem(
                        folderType.name,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        { 
                            items: this._projectData[folderType.key],
                            type: folderType.key,
                            icon: folderType.icon
                        }
                    ));
                }
            }
            
            return rootItems;
        }
        
        // Symbolic folder - show children (folders and files)
        if (element.contextValue === 'symbolicFolder') {
            return this.getSymbolicFolderChildren(element.data.folder);
        }
        
        // Standard folder category - show files or subfolders
        if (element.contextValue === 'folderCategory') {
            return this.getFolderCategoryChildren(element.data.items);
        }
        
        // Regular folder - show children
        if (element.contextValue === 'folder') {
            return this.getFolderChildren(element.data.children);
        }
        
        return [];
    }
    
    getSymbolicFolderChildren(folder) {
        return folder.children.map(child => {
            if (child.type === 'folder') {
                return new VS6ProjectItem(
                    child.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    { children: child.children, type: 'folder' }
                );
            } else {
                const uri = vscode.Uri.file(child.path);
                return new VS6ProjectItem(
                    child.name,
                    vscode.TreeItemCollapsibleState.None,
                    { uri, type: 'file', extension: child.extension },
                    {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [uri]
                    }
                );
            }
        });
    }
    
    getFolderCategoryChildren(items) {
        return items.map(item => {
            if (item.type === 'folder') {
                return new VS6ProjectItem(
                    item.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    { children: item.children, type: 'folder' }
                );
            } else {
                const uri = vscode.Uri.file(item.path);
                return new VS6ProjectItem(
                    item.name,
                    vscode.TreeItemCollapsibleState.None,
                    { uri, type: 'file', extension: path.extname(item.path).toLowerCase() },
                    {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [uri]
                    }
                );
            }
        });
    }
    
    getFolderChildren(children) {
        return children.map(child => {
            if (child.type === 'folder') {
                return new VS6ProjectItem(
                    child.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    { children: child.children, type: 'folder' }
                );
            } else {
                const uri = vscode.Uri.file(child.path);
                return new VS6ProjectItem(
                    child.name,
                    vscode.TreeItemCollapsibleState.None,
                    { uri, type: 'file', extension: child.extension },
                    {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [uri]
                    }
                );
            }
        });
    }
}

class VS6ProjectItem extends vscode.TreeItem {
    constructor(label, collapsibleState, data = {}, command) {
        super(label, collapsibleState);
        this.data = data;
        this.command = command;
        
        // Set contextValue based on the item type
        if (data.type === 'symbolicFolder') {
            this.contextValue = 'symbolicFolder';
            this.iconPath = new vscode.ThemeIcon('folder');
            
            // Set specific icon based on known folder names
            const folderName = data.folder.name.toLowerCase();
            if (folderName.includes('source') || folderName.includes('src') || folderName.includes('소스')) {
                this.iconPath = new vscode.ThemeIcon('file-code');
            } else if (folderName.includes('header') || folderName.includes('include') || folderName.includes('헤더')) {
                this.iconPath = new vscode.ThemeIcon('file-submodule');
            } else if (folderName.includes('resource') || folderName.includes('res') || folderName.includes('리소스')) {
                this.iconPath = new vscode.ThemeIcon('file-media');
            }
        } else if (data.type === 'folderCategory') {
            this.contextValue = 'folderCategory';
            this.iconPath = new vscode.ThemeIcon(data.icon || 'folder');
        } else if (data.type === 'folder') {
            this.contextValue = 'folder';
            this.iconPath = new vscode.ThemeIcon('folder');
        } else if (data.uri) {
            this.contextValue = 'file';
            this.resourceUri = data.uri;
            
            // Set icon based on file extension
            const ext = data.extension || path.extname(data.uri.fsPath).toLowerCase();
            if (ext === '.frm') {
                this.iconPath = new vscode.ThemeIcon('symbol-class');
            } else if (ext === '.bas') {
                this.iconPath = new vscode.ThemeIcon('symbol-module');
            } else if (ext === '.cls') {
                this.iconPath = new vscode.ThemeIcon('symbol-class');
            } else if (ext === '.h' || ext === '.hpp') {
                this.iconPath = new vscode.ThemeIcon('symbol-interface');
            } else if (ext === '.c' || ext === '.cpp') {
                this.iconPath = new vscode.ThemeIcon('symbol-method');
            } else if (ext === '.rc') {
                this.iconPath = new vscode.ThemeIcon('file-binary');
            } else {
                this.iconPath = new vscode.ThemeIcon('file');
            }
        }
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Visual Studio 6 Support extension is now active!');
    
    // Create the VS6 project explorer instance
    const vs6Explorer = new VS6ProjectExplorer();
    
    // Register the tree data provider
    vscode.window.registerTreeDataProvider('vs6ProjectExplorer', vs6Explorer);
    
    // Register the command to open a DSP file
    const openDSPCommand = vscode.commands.registerCommand('visual-studio-6-support.openDSPProject', async () => {
        const options = {
            canSelectMany: false,
            openLabel: 'Open',
            filters: {
                'VS6 Project Files': ['dsp'],
                'All Files': ['*']
            }
        };
        
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            vs6Explorer.openProjectFile(fileUri[0].fsPath);
        }
    });
    
    // Add command to refresh the view
    const refreshCommand = vscode.commands.registerCommand('visual-studio-6-support.refreshProjectView', () => {
        vs6Explorer.refresh();
    });

    // Register file system watcher for .dsp files to auto-refresh
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.dsp');
    watcher.onDidChange(uri => {
        if (vs6Explorer._projectFile === uri.fsPath) {
            vs6Explorer.openProjectFile(uri.fsPath);
        }
    });

    // Register the new command for setting Korean encoding
    let disposable = vscode.commands.registerCommand('visual-studio-6-support.setKoreanEncoding', async () => {
        const encodings = ['utf8', 'cp949', 'euc-kr'];
        const selected = await vscode.window.showQuickPick(encodings, {
            placeHolder: 'Select encoding for Korean filenames'
        });
        
        if (selected) {
            await vscode.workspace.getConfiguration('visual-studio-6-support').update('fileEncoding', selected, true);
            vscode.window.showInformationMessage(`Encoding set to ${selected}`);
            // Refresh the view to show correct filenames
            vscode.commands.executeCommand('visual-studio-6-support.refreshProjectView');
        }
    });
    
    context.subscriptions.push(
        openDSPCommand,
        refreshCommand,
        watcher,
        disposable
    );
}

// Helper function to read directory with proper encoding
function readDirectoryWithEncoding(path) {
    const encoding = vscode.workspace.getConfiguration('visual-studio-6-support').get('fileEncoding', 'utf8');
    
    // For UTF-8, use the standard fs.readdirSync
    if (encoding === 'utf8') {
        return fs.readdirSync(path);
    }
    
    // For other encodings, we need special handling
    const files = [];
    const buffer = Buffer.from(path);
    
    // This is a simplified example. In a real implementation, you might need
    // to use more advanced techniques or a native module to handle this correctly
    try {
        const dirHandle = fs.opendirSync(path);
        let entry;
        while ((entry = dirHandle.readSync()) !== null) {
            // Convert the Buffer to the correct encoding
            const nameDecoded = iconv.decode(Buffer.from(entry.name), encoding);
            files.push({
                name: nameDecoded,
                isDirectory: entry.isDirectory()
            });
        }
        dirHandle.closeSync();
    } catch (error) {
        console.error('Error reading directory with encoding:', error);
    }
    
    return files;
}

// Use this function when reading directories in your extension

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
