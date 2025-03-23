const fs = require('fs');
const path = require('path');
const { convertFileName } = require('./encoding');

/**
 * Recursively scans directories and builds a tree structure
 * with proper encoding for all folder and file names
 * 
 * @param {string} dir Directory path to scan
 * @param {object} options Options for scanning
 * @param {Array<string>} options.extensions File extensions to include
 * @param {boolean} options.showAllFiles Whether to show all files or just project files
 * @returns {Array} Tree structure of files and folders
 */
function scanDirectoryRecursively(dir, options = { extensions: [], showAllFiles: false }) {
    const items = [];
    
    try {
        // Read directory contents
        const dirEntries = fs.readdirSync(dir);
        
        for (const entryName of dirEntries) {
            const entryPath = path.join(dir, entryName);
            const stats = fs.statSync(entryPath);
            
            // Convert the name using the proper encoding
            const displayName = convertFileName(entryName);
            
            if (stats.isDirectory()) {
                // It's a directory - recursively scan it
                const children = scanDirectoryRecursively(entryPath, options);
                
                // Only add the directory if it has contents or we're showing all items
                if (children.length > 0 || options.showAllFiles) {
                    items.push({
                        name: displayName,  // Fixed: Removed test prefix
                        path: entryPath,
                        type: 'folder',
                        children
                    });
                }
            } else {
                // It's a file
                const ext = path.extname(entryName).toLowerCase();
                
                // Include file if we're showing all files or it matches our extensions
                if (options.showAllFiles || options.extensions.includes(ext)) {
                    items.push({
                        name: displayName,
                        path: entryPath,
                        type: 'file',
                        extension: ext
                    });
                }
            }
        }
        
        // Sort: folders first, then files, both alphabetically
        items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        return items;
    } catch (error) {
        console.error(`Error scanning directory ${dir}: ${error.message}`);
        return [];
    }
}

module.exports = {
    scanDirectoryRecursively
};
