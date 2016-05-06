/// <reference path="../typings/tsd.d.ts" />

import { ExtensionContext, commands, window, workspace, QuickPickItem, QuickPickOptions, TextEditor } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';

export function activate(context: ExtensionContext) {

  console.log('Your extension "vscode-new-file" is now active!');

  let disposable = commands.registerCommand('extension.createNewFile', () => {

    const File = new FileController();

    File.showFileNameDialog()
      .then(File.determineFullPath)
      .then(File.createFile)
      .then(File.openFileInEditor)
      .catch((err) => {
        if (err) {
          window.showErrorMessage(err);
        }
      });
  });

  context.subscriptions.push(disposable);
}

export class FileController {
  public showFileNameDialog(): Q.Promise<string> {
    const currentFileName: string = window.activeTextEditor ? window.activeTextEditor.document.fileName : '';
    const ext: string = path.extname(currentFileName) || '.ts';
    const deferred: Q.Deferred<string> = Q.defer<string>();

    window.showInputBox({
      prompt: 'What\'s the path and name of the new file?',
      value: `newFile${ext}`
    }).then((relativeFilePath) => {
      if (relativeFilePath) {
        deferred.resolve(relativeFilePath);
      }
    });

    return deferred.promise;
  }

  public createFile(newFileName): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();
    let dirname: string = path.dirname(newFileName);
    let fileExists: boolean = fs.existsSync(newFileName);

    if (!fileExists) {
      mkdirp.sync(dirname);

      fs.appendFile(newFileName, '', (err) => {
        if (err) {
          deferred.reject(err.message);
          return;
        }

        deferred.resolve(newFileName);
      });
    } else {
      deferred.resolve(newFileName);
    }

    return deferred.promise;
  }

  public openFileInEditor(fileName): Q.Promise<TextEditor> {
    const deferred: Q.Deferred<TextEditor> = Q.defer<TextEditor>();

    workspace.openTextDocument(fileName).then((textDocument) => {
      if (!textDocument) {
        deferred.reject('Could not open file!');
        return;
      }

      window.showTextDocument(textDocument).then((editor) => {
        if (!editor) {
          deferred.reject('Could not show document!');
          return;
        }

        deferred.resolve(editor);
      });
    });

    return deferred.promise;
  }

  public determineFullPath(filePath) {
    const deferred = Q.defer<string>();
    const choices: QuickPickItem[] = [];
    
    // Suggest path relative to current file
    if (window.activeTextEditor && !window.activeTextEditor.document.isUntitled) {
      choices.push({
        label: "Relative to current file",
        description: path.join(path.dirname(window.activeTextEditor.document.fileName), filePath)
      });
    }
    
    // Suggest path relative to workspace
    if (workspace.rootPath) {
      choices.push({
        label: "Relative to workspace",
        description: path.join(workspace.rootPath, filePath)
      });
    }
    
    // Suggest path relative to home dir
    const homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    choices.push({
      label: "Relative to home path",
      description: path.join(homePath, filePath)
    });

    const options: QuickPickOptions = {
      matchOnDescription: false,
      placeHolder: "What base path should the file be created relative to?"
    };

    window.showQuickPick(choices, options).then((choice) => {
      if (!choice) {
        deferred.reject(null);
        return;
      }
      
      deferred.resolve(choice.description);
    });

    return deferred.promise;
  }
}