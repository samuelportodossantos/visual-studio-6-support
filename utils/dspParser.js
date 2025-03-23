const fs = require('fs');
const path = require('path');
const { convertEncoding, getCurrentEncoding, convertFolderName } = require('./encoding');

/**
 * Parses a Visual Studio 6 DSP file and extracts project structure with folders and files
 * @param {string} dspFilePath Path to the DSP file
 * @returns {Object} Project structure with files organized into folders
 */
function parseDSPFile(dspFilePath) {
    try {
        // Get the encoding from settings
        const encoding = getCurrentEncoding();
        
        // Read the DSP file with the specified encoding
        const buffer = fs.readFileSync(dspFilePath);
        const dspContent = convertEncoding(buffer.toString('binary'), encoding);
        
        const projectRoot = path.dirname(dspFilePath);
        const projectName = path.basename(dspFilePath, '.dsp');
        
        // Extract project structure with symbolic folders
        const projectStructure = parseSymbolicFolders(dspContent, projectRoot, encoding);
        
        return {
            name: projectName,
            path: dspFilePath,
            ...projectStructure
        };
    } catch (error) {
        console.error(`Error parsing DSP file: ${error.message}`);
        return {
            name: path.basename(dspFilePath, '.dsp'),
            path: dspFilePath,
            symbolicFolders: [],
            sourceFiles: [],
            headerFiles: [],
            resourceFiles: [],
            otherFiles: []
        };
    }
}

/**
 * Parses the content of a DSP file and extracts symbolic folders and their files
 * @param {string} dspContent Content of the DSP file
 * @param {string} projectRoot Root directory of the project
 * @param {string} encoding File encoding
 * @returns {Object} Project structure with symbolic folders and files
 */
function parseSymbolicFolders(dspContent, projectRoot, encoding) {
    // Arrays to store files by type
    const symbolicFolders = [];
    const sourceFiles = [];
    const headerFiles = [];
    const resourceFiles = [];
    const otherFiles = [];
    
    // Split content by lines for easier processing
    const lines = dspContent.split(/\r?\n/);
    
    let currentFolder = null;
    let currentFolderFilter = "";
    let inSourceFile = false;
    let currentSourceFile = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Begin Group indicates a symbolic folder
        if (line.startsWith('# Begin Group')) {
            const folderNameMatch = line.match(/# Begin Group "([^"]+)"/);
            if (folderNameMatch) {
                const folderName = folderNameMatch[1];
                // Convert the folder name with proper encoding
                const displayName = convertFolderName(folderName);
                
                currentFolder = {
                    name: displayName,
                    originalName: folderName,
                    filter: "",
                    files: []
                };
            }
        }
        // Default filter for the current folder
        else if (line.startsWith('# PROP Default_Filter') && currentFolder) {
            const filterMatch = line.match(/# PROP Default_Filter "([^"]+)"/);
            if (filterMatch) {
                currentFolder.filter = filterMatch[1];
                currentFolderFilter = filterMatch[1];
            }
        }
        // End of a folder group
        else if (line === '# End Group' && currentFolder) {
            symbolicFolders.push(currentFolder);
            currentFolder = null;
            currentFolderFilter = "";
        }
        // Begin Source File indicates a file entry
        else if (line === '# Begin Source File') {
            inSourceFile = true;
            currentSourceFile = null;
        }
        // Source file path
        else if (inSourceFile && line.startsWith('SOURCE=')) {
            const filePath = line.substring(7).trim();
            // Handle quoted and non-quoted paths
            const cleanPath = filePath.startsWith('"') ? 
                filePath.substring(1, filePath.length - 1) : filePath;
                
            // Convert path separators
            const normalizedPath = cleanPath.replace(/\\/g, path.sep);
            const fullPath = path.resolve(projectRoot, normalizedPath);
            
            // Get file extension
            const extension = path.extname(fullPath).toLowerCase();
            
            // Create file entry
            currentSourceFile = {
                path: fullPath,
                name: path.basename(fullPath),
                extension: extension
            };
            
            // Add to appropriate collection
            if (currentFolder) {
                currentFolder.files.push(currentSourceFile);
            } else {
                // Files not in any folder go to type-based collections
                if (['.c', '.cpp', '.cxx'].includes(extension)) {
                    sourceFiles.push(fullPath);
                } else if (['.h', '.hpp', '.hxx'].includes(extension)) {
                    headerFiles.push(fullPath);
                } else if (['.rc', '.ico', '.bmp', '.cur'].includes(extension)) {
                    resourceFiles.push(fullPath);
                } else {
                    otherFiles.push(fullPath);
                }
            }
        }
        // End of a source file entry
        else if (line === '# End Source File') {
            inSourceFile = false;
        }
    }
    
    // Process symbolic folders to create proper tree structure
    const processedFolders = processSymbolicFolders(symbolicFolders, projectRoot);
    
    return {
        symbolicFolders: processedFolders,
        sourceFiles: buildFolderTree(sourceFiles, projectRoot),
        headerFiles: buildFolderTree(headerFiles, projectRoot),
        resourceFiles: buildFolderTree(resourceFiles, projectRoot),
        otherFiles: buildFolderTree(otherFiles, projectRoot)
    };
}

/**
 * Processes symbolic folders to create a tree structure
 * @param {Array} symbolicFolders List of symbolic folders from DSP
 * @param {string} projectRoot Root directory of the project
 * @returns {Array} Processed folders with proper tree structure
 */
function processSymbolicFolders(symbolicFolders, projectRoot) {
    const result = [];
    
    for (const folder of symbolicFolders) {
        // Group files by their parent paths
        const filesByFolder = {};
        
        for (const file of folder.files) {
            // Get parent directory of the file
            const relativePath = path.relative(projectRoot, path.dirname(file.path));
            if (!filesByFolder[relativePath]) {
                filesByFolder[relativePath] = [];
            }
            filesByFolder[relativePath].push(file);
        }
        
        // Create tree nodes for each folder
        const folderTree = {
            name: folder.name,
            originalName: folder.originalName,
            filter: folder.filter,
            type: 'folder',
            children: []
        };
        
        // Add direct files (files in the root of the symbolic folder)
        if (filesByFolder['']) {
            for (const file of filesByFolder['']) {
                folderTree.children.push({
                    name: convertFolderName(file.name),
                    path: file.path,
                    type: 'file',
                    extension: file.extension
                });
            }
            delete filesByFolder[''];
        }
        
        // Process remaining paths
        for (const relativePath in filesByFolder) {
            const pathParts = relativePath.split(path.sep);
            let currentNode = folderTree;
            
            // Create folder hierarchy
            for (const part of pathParts) {
                if (!part) continue;
                
                const displayName = convertFolderName(part);
                let subFolder = currentNode.children.find(child => 
                    child.type === 'folder' && child.name === displayName);
                    
                if (!subFolder) {
                    subFolder = {
                        name: displayName,
                        originalName: part,
                        type: 'folder',
                        children: []
                    };
                    currentNode.children.push(subFolder);
                }
                
                currentNode = subFolder;
            }
            
            // Add files to the current folder
            for (const file of filesByFolder[relativePath]) {
                currentNode.children.push({
                    name: convertFolderName(file.name),
                    path: file.path,
                    type: 'file',
                    extension: file.extension
                });
            }
        }
        
        // Sort children
        sortTreeNodes(folderTree);
        result.push(folderTree);
    }
    
    return result;
}

/**
 * Builds a folder tree structure from an array of file paths
 * @param {string[]} filePaths Array of file paths
 * @param {string} rootDir Root directory to make paths relative to
 * @returns {Object[]} Tree structure with folders and files
 */
function buildFolderTree(filePaths, rootDir) {
    const tree = {
        name: path.basename(rootDir),
        path: rootDir,
        type: 'folder',
        children: []
    };
    
    for (const filePath of filePaths) {
        // Make the path relative to the project root
        const relativePath = path.relative(rootDir, filePath);
        const pathParts = relativePath.split(path.sep);
        
        // Start at the root of the tree
        let currentNode = tree;
        
        // Handle the directory path (all parts except the last one, which is the file)
        for (let i = 0; i < pathParts.length - 1; i++) {
            const folderName = pathParts[i];
            
            // Convert encoding of the folder name for display using specialized function
            const displayName = convertFolderName(folderName);
            
            // Check if this folder already exists in the current node
            let folderNode = currentNode.children.find(child => 
                child.type === 'folder' && child.name === displayName);
                
            if (!folderNode) {
                // Create the folder if it doesn't exist
                folderNode = {
                    name: displayName,
                    path: path.join(currentNode.path, folderName),
                    type: 'folder',
                    children: []
                };
                currentNode.children.push(folderNode);
            }
            
            // Move to this folder for the next iteration
            currentNode = folderNode;
        }
        
        // Now add the file to the current node (which is the right folder)
        const fileName = pathParts[pathParts.length - 1];
        const displayName = convertEncoding(fileName, getCurrentEncoding(), 'utf8');
        
        currentNode.children.push({
            name: displayName,
            path: filePath,
            type: 'file',
            extension: path.extname(fileName).toLowerCase()
        });
    }
    
    // Sort all folders and files
    sortTreeNodes(tree);
    
    return tree.children;
}

/**
 * Recursively sorts nodes in a tree (folders first, then alphabetically)
 * @param {Object} node The node to sort
 */
function sortTreeNodes(node) {
    if (node.children && node.children.length > 0) {
        // Sort the children
        node.children.sort((a, b) => {
            // Folders come before files
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            // Alphabetical sort
            return a.name.localeCompare(b.name);
        });
        
        // Sort children of children recursively
        for (const child of node.children) {
            if (child.type === 'folder') {
                sortTreeNodes(child);
            }
        }
    }
}

module.exports = {
    parseDSPFile
};
