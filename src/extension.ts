/// <reference path="../typings/tsd.d.ts" />

import { ExtensionContext, commands, window, workspace, QuickPickItem, QuickPickOptions, TextEditor } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';
import { homedir } from 'os';

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
  public getDefaultFileName(): string {
    if (!window.activeTextEditor) {
      return path.join(homedir(), 'newFile.ts');
    }
    
    const currentFileName: string = window.activeTextEditor ? window.activeTextEditor.document.fileName : '';
    const ext: string = path.extname(currentFileName) || '.ts';
    const filePath: string = path.dirname(currentFileName);
    
    return path.join(filePath, `newFile${ext}`);
  }
  
  public showFileNameDialog(): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();

    window.showInputBox({
      prompt: 'What\'s the path and name of the new file? (Relative to current file)',
      value: this.getDefaultFileName()
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

  public determineFullPath(filePath): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();
    const homePath: string = homedir();
    let suggestedPath: string = path.join(homePath, filePath);
    const root: string = window.activeTextEditor ? window.activeTextEditor.document.fileName : suggestedPath;
    const isUntitled: boolean = window.activeTextEditor ? window.activeTextEditor.document.isUntitled : true;

    if (filePath.indexOf('/') === 0 || filePath.indexOf('~') === 0) {
      deferred.resolve(filePath);
      return deferred.promise;
    }

    if (root && !isUntitled) {
      deferred.resolve(path.join(path.dirname(root), filePath))
      return deferred.promise;
    }

    const options: QuickPickOptions = {
      matchOnDescription: true,
      placeHolder: "You don't have a file open. Should we use your home path?"
    };

    const choices: QuickPickItem[] = [
      { label: 'Yes', description: `Use ${suggestedPath}.`},
      { label: 'No', description: 'Let me declare the absolute path.'}
    ];

    window.showQuickPick(choices, options).then((choice) => {
      if (!choice) {
        deferred.reject(null);
        return;
      }

      if (choice.label === 'Yes') {
        deferred.resolve(suggestedPath);
        return;
      }

      window.showInputBox({
        prompt: `What should be the base path for '${filePath}'`,
        value: homePath
      }).then((basePath) => {
        if (!basePath) {
          deferred.reject(null);
          return;
        }

        deferred.resolve(path.join(basePath, filePath));
      })
    });

    return deferred.promise;
  }
}