# Visual Studio 6 Project Support

This extension provides support for working with Visual Studio 6 projects (.dsp files) in Visual Studio Code.

## Features

- **VS6 Project Explorer**: View and navigate Visual Studio 6 project files in a dedicated explorer view
- **Project Structure**: See your project's folders and files organized according to the DSP project structure
- **File Opening**: Easily open project files directly from the explorer view
- **Encoding Support**: Special support for Korean encodings (CP949/EUC-KR) for properly displaying folder and file names

<!-- Screenshot will be added soon -->

## Usage

1. Click on the VS6 Explorer icon in the activity bar
2. Use the "Open Visual Studio 6 Project" button to select a .dsp file
3. Navigate through the project structure to find and open files

## Extension Settings

This extension contributes the following settings:

* `visual-studio-6-support.fileEncoding`: Choose the encoding for reading project files and directory names
  * Options: `utf8` (default), `cp949` (Korean), `euc-kr` (Korean)

## Commands

* `VS6: Open Visual Studio 6 Project`: Open a .dsp project file
* `VS6: Refresh Project View`: Refresh the current project view
* `VS6: Set Korean File Encoding (CP949)`: Change the encoding for Korean file names

## Requirements

- Visual Studio Code 1.98.0 or higher

## Known Issues

- Limited support for .mak files and other VS6 project types
- No build integration yet

## Release Notes

### 0.0.1

- Initial release with basic DSP file support
- Project explorer view
- Korean encoding support
