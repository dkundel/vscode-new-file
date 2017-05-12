/// <reference path="../typings/tsd.d.ts" />

import { ExtensionContext, commands, window, workspace, QuickPickItem, QuickPickOptions, TextEditor } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';

export function activate(context: ExtensionContext) {

  console.log('Your extension "vscode-new-file" is now active!');

  let disposable = commands.registerCommand('extension.createNewFile', () => {

    const File = new FileController().readSettings();

    File.showFileNameDialog()
      .then(File.createFile)
      .then(File.openFileInEditor)
      .catch((err) => {
        if (err.message) {
          window.showErrorMessage(err.message);
        }
      });
  });

  context.subscriptions.push(disposable);
}

export interface NewFileSettings {
  showFullPath: boolean;
  relativeTo: string;
  rootDirectory: string;
  defaultFileExtension: string;
  defaultBaseFileName: string;
}

export class FileController {
  private settings: NewFileSettings;

  public readSettings(): FileController{
    let config = workspace.getConfiguration('newFile');

    this.settings = {
      showFullPath: config.get('showFullPath', true),
      relativeTo: config.get('relativeTo', 'file'),
      rootDirectory: config.get('rootDirectory', this.homedir()),
      defaultFileExtension: config.get('defaultFileExtension', '.ts'),
      defaultBaseFileName: config.get('defaultBaseFileName', 'newFile')
    };

    return this;
  }

  public determineRoot(): string {
    let root: string;

    if (this.settings.relativeTo === 'project') {
      root = workspace.rootPath;
    } else if (this.settings.relativeTo === 'file') {
      if (window.activeTextEditor) {
        root = path.dirname(window.activeTextEditor.document.fileName);
      } else if (workspace.rootPath) {
        root = workspace.rootPath;
      }
    }

    if (!root) {
      this.settings.relativeTo === 'root';
      root = this.settings.rootDirectory;

      if (root.indexOf('~') === 0) {
        root = path.join(this.homedir(), root.substr(1));
      }
    }

    return root;
  }

  public getDefaultFileValue(root): string {
    const newFileName = this.settings.defaultBaseFileName;
    const defaultExtension = this.settings.defaultFileExtension;
    
    const currentFileName: string = window.activeTextEditor ? window.activeTextEditor.document.fileName : '';
    const ext: string = path.extname(currentFileName) || defaultExtension;
    
    if (this.settings.showFullPath) {
      return path.join(root, `${newFileName}${ext}`);
    } else {
      return `${newFileName}${ext}`;
    }
  }
  
  public showFileNameDialog(): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();
    let question = `What's the path and name of the new file?`;

    if (!this.settings.showFullPath) {
      if (this.settings.relativeTo === 'project') {
        question += ' (Relative to project root)';
      } else if (this.settings.relativeTo === 'file') {
        question += ' (Relative to current file)';
      }
    }

    let rootPath = this.determineRoot();
    let defaultFileValue = this.getDefaultFileValue(rootPath);

    window.showInputBox({
      prompt: question,
      value: defaultFileValue
    }).then(selectedFilePath => {
      if (selectedFilePath === null || typeof selectedFilePath === 'undefined') {
        deferred.reject(undefined);
        return;
      }
      selectedFilePath = selectedFilePath || defaultFileValue;
      if (selectedFilePath) {
        if (this.settings.showFullPath) {
          deferred.resolve(selectedFilePath);
        } else {
          deferred.resolve(this.getFullPath(rootPath, selectedFilePath));
        }
      }
    });

    return deferred.promise;
  }

  public createFile(newBaseFileName): Q.Promise<string> {
    const defaultExtension = this.settings.defaultFileExtension;
    
    const currentFileName: string = window.activeTextEditor ? window.activeTextEditor.document.fileName : '';
    const ext: string = path.extname(currentFileName) || defaultExtension;
    const newFileName = path.extname(newBaseFileName) ? newBaseFileName : (newBaseFileName + ext);
    
    const deferred: Q.Deferred<string> = Q.defer<string>();
    let dirname: string = path.dirname(newFileName);
    let fileExists: boolean = fs.existsSync(newFileName);

    if (!fileExists) {
      mkdirp.sync(dirname);

      fs.appendFile(newFileName, '', (err) => {
        if (err) {
          deferred.reject(err);
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
        deferred.reject(new Error('Could not open file!'));
        return;
      }

      window.showTextDocument(textDocument).then((editor) => {
        if (!editor) {
          deferred.reject(new Error('Could not show document!'));
          return;
        }

        deferred.resolve(editor);
      });
    });

    return deferred.promise;
  }

  private getFullPath(root: string, filePath: string): string {
    if (filePath.indexOf('/') === 0) {
      return filePath;
    }

    if (filePath.indexOf('~') === 0) {
      return path.join(this.homedir(), filePath.substr(1));
    }

    return path.resolve(root, filePath);
  }
  
  private homedir(): string {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  }
}
