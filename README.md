![logo](images/logo-300x.png)
# Advanced New File - Visual Studio Code Extension

Making the creation of a new file even easier. Specify the name of the file on creation and if you define a path that doesn't exist yet the folders will be created.
Before using the extension please make sure to read the [Disclaimer](#Disclaimer).

> Inspired by [Scott Kuroda]()'s [AdvancedNewFile](https://github.com/skuroda/Sublime-AdvancedNewFile) for Sublime.

# How to use 

1. Press the Shortcut <kbd>Cmd+Alt+N</kbd> or run the `Files: Advanced New File` command.

2. Enter a relative file path or stick with the default. If you have a file open it will guess the extension based on the current extension.

3. If you don't have a project open in your workspace, the extension will ask you which base path you want to have.

4. An empty file will be created and the cursor will be placed into the new file.

5. Happy Coding! :)  

# How to contribute

1. Download source code and install dependencies 
```
git clone git@github.com:dkundel/vscode-new-file.git
cd vscode-new-file
npm install
code .
```
2. Make the respective code changes.
3. Go to the debugger in VS Code, choose `Launch Extension` and click run. You can test your changes.
4. Choose `Launch Tests` to run the tests.
5. Submit a PR.

# Backlog

  - Add additional tests

# Disclaimer

**Important:** This extension due to the nature of it's purpose will create
files on your hard drive and if necessary create the respective folder structure.
While it should not override any files during this process, I'm not giving any guarantees
or take any responsibility in case of lost data. 

# Contributors

[Dominik Kundel](https://github.com/dkundel)

# License

MIT