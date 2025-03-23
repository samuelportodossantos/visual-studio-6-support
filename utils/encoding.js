const iconv = require('iconv-lite');
const vscode = require('vscode');

/**
 * Converts a string from one encoding to another
 * @param {string} text Text to convert
 * @param {string} fromEncoding Source encoding (e.g., 'cp949', 'euc-kr')
 * @param {string} toEncoding Target encoding (usually 'utf8')
 * @returns {string} Converted text
 */
function convertEncoding(text, fromEncoding, toEncoding = 'utf8') {
    if (!text) return text;
    
    try {
        // For non-utf8 to utf8 conversion (displaying in UI)
        if (fromEncoding !== 'utf8' && toEncoding === 'utf8') {
            // Create a buffer with the source encoding and decode to utf8
            const buffer = Buffer.from(text, 'binary');
            return iconv.decode(buffer, fromEncoding);
        } 
        // For utf8 to non-utf8 conversion (file system operations)
        else if (fromEncoding === 'utf8' && toEncoding !== 'utf8') {
            return iconv.encode(text, toEncoding).toString('binary');
        }
        // Direct conversion between encodings
        else {
            const buffer = iconv.encode(text, fromEncoding);
            return iconv.decode(buffer, toEncoding);
        }
    } catch (error) {
        console.error(`Error converting encoding: ${error.message}`);
        return text; // Return original text if conversion fails
    }
}

/**
 * Gets the current encoding setting from VS Code configuration
 * @returns {string} Current encoding setting
 */
function getCurrentEncoding() {
    const config = vscode.workspace.getConfiguration('visual-studio-6-support');
    return config.get('fileEncoding', 'utf8');
}

/**
 * Converts folder/file name using the current encoding setting for display
 * @param {string} name The folder or file name to convert
 * @returns {string} The converted name for display
 */
function convertFileName(name) {
    const encoding = getCurrentEncoding();
    if (encoding === 'utf8') return name;
    
    // For non-UTF8 encodings like cp949, convert for proper display
    // For Korean folders specifically, we need to handle cp949/euc-kr encoding
    return convertEncoding(name, encoding, 'utf8');
}

/**
 * Specifically for Korean folder names in DSP files
 * @param {string} name The folder name found in DSP file
 * @returns {string} The properly encoded folder name for display
 */
function convertFolderName(name) {
    const encoding = getCurrentEncoding();
    // Korean encodings need special handling for folder names
    if (encoding === 'cp949' || encoding === 'euc-kr') {
        return convertEncoding(name, encoding, 'utf8');
    }
    return name;
}

module.exports = {
    convertEncoding,
    getCurrentEncoding,
    convertFileName,
    convertFolderName
};
