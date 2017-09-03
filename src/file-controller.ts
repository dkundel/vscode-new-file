import {
  commands,
  ExtensionContext,
  QuickPickItem,
  QuickPickOptions,
  TextEditor,
  window,
  workspace
} from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';
import * as Debug from 'debug';
import * as braces from 'braces';

const debug = Debug('vscode-new-file');

export interface NewFileSettings {
  showPathRelativeTo: 'root' | 'project' | 'none';
  relativeTo: 'root' | 'project' | 'file';
  rootDirectory: string;
  defaultFileExtension: string;
  defaultBaseFileName: string;
  expandBraces: boolean;
}

export class FileController {
  private settings: NewFileSettings;

  private rootPath: string;

  public readSettings(): FileController {
    let config = workspace.getConfiguration('newFile');

    this.settings = {
      showPathRelativeTo: config.get('showPathRelativeTo', 'root'),
      relativeTo: config.get('relativeTo', 'file'),
      rootDirectory: config.get('rootDirectory', this.homedir()),
      defaultFileExtension: config.get('defaultFileExtension', '.ts'),
      defaultBaseFileName: config.get('defaultBaseFileName', 'newFile'),
      expandBraces: config.get('expandBraces', false)
    };

    const showFullPath = config.get('showFullPath') as boolean | undefined;
    if (showFullPath) {
      window.showInformationMessage(
        'You are using a deprecated option "showFullPath". Switch instead to "showFullPathRelativeTo"'
      );
      this.settings.showPathRelativeTo = 'root';
    }

    return this;
  }

  public getRootFromExplorerPath(filePath: string): Q.Promise<string> {
    let dir = path.dirname(filePath);
    const stats = fs.statSync(dir);
    if (!stats.isDirectory()) {
      dir = path.resolve(dir, '..');
    }

    this.rootPath = dir;

    return Q(dir);
  }

  public determineRoot(): Q.Promise<string> {
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
      root = this.settings.rootDirectory;

      if (root.indexOf('~') === 0) {
        root = path.join(this.homedir(), root.substr(1));
      }
    }

    this.rootPath = root;

    return Q(root);
  }

  public getDefaultFileValue(root: string): Q.Promise<string> {
    const newFileName = this.settings.defaultBaseFileName;
    const defaultExtension = this.settings.defaultFileExtension;

    const currentFileName: string = window.activeTextEditor
      ? window.activeTextEditor.document.fileName
      : '';
    const ext: string = path.extname(currentFileName) || defaultExtension;

    if (this.settings.showPathRelativeTo !== 'none') {
      const fullPath = path.join(root, `${newFileName}${ext}`);
      if (this.settings.showPathRelativeTo === 'project') {
        return Q(fullPath.replace(workspace.rootPath + path.sep, ''));
      }
      return Q(fullPath);
    } else {
      return Q(`${newFileName}${ext}`);
    }
  }

  public showFileNameDialog(
    defaultFileValue: string,
    fromExplorer: boolean = false
  ): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();
    let question = `What's the path and name of the new file?`;

    if (fromExplorer) {
      question += ' (Relative to selected file)';
    } else if (this.settings.showPathRelativeTo === 'none') {
      if (this.settings.relativeTo === 'project') {
        question += ' (Relative to project root)';
      } else if (this.settings.relativeTo === 'file') {
        question += ' (Relative to current file)';
      }
    } else if (this.settings.showPathRelativeTo === 'project') {
      question += ' (Relative to project root)';
    }

    window
      .showInputBox({
        prompt: question,
        value: defaultFileValue
      })
      .then(selectedFilePath => {
        if (
          selectedFilePath === null ||
          typeof selectedFilePath === 'undefined'
        ) {
          deferred.reject(undefined);
          return;
        }
        selectedFilePath = selectedFilePath || defaultFileValue;
        if (selectedFilePath) {
          if (selectedFilePath.startsWith('./')) {
            deferred.resolve(this.normalizeDotPath(selectedFilePath));
          } else {
            if (this.settings.showPathRelativeTo !== 'none') {
              if (this.settings.showPathRelativeTo === 'project') {
                selectedFilePath = path.resolve(
                  workspace.rootPath,
                  selectedFilePath
                );
              }
              deferred.resolve(selectedFilePath);
            } else {
              deferred.resolve(
                this.getFullPath(this.rootPath, selectedFilePath)
              );
            }
          }
        }
      });

    return deferred.promise;
  }

  public createFiles(userEntry: string): Q.Promise<string[]> {
    if (!this.settings.expandBraces) {
      return Q.all([this.createFile(userEntry)]);
    }

    const newFileNames = braces.expand(userEntry);
    const fileCreationPromises: Q.Promise<
      string
    >[] = newFileNames.map(fileName => this.createFile(fileName));
    return Q.all(fileCreationPromises);
  }

  public createFile(newFileName: string): Q.Promise<string> {
    const deferred: Q.Deferred<string> = Q.defer<string>();
    let dirname: string = path.dirname(newFileName);
    let fileExists: boolean = fs.existsSync(newFileName);

    if (!fileExists) {
      mkdirp.sync(dirname);

      fs.appendFile(newFileName, '', err => {
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

  public openFilesInEditor(fileNames: string[]): Q.Promise<TextEditor>[] {
    return fileNames.map(fileName => {
      const deferred: Q.Deferred<TextEditor> = Q.defer<TextEditor>();
      const stats = fs.statSync(fileName);

      if (stats.isDirectory()) {
        window.showInformationMessage(
          'This file is already a directory. Try a different name.'
        );
        deferred.resolve();
        return deferred.promise;
      }

      workspace.openTextDocument(fileName).then(textDocument => {
        if (!textDocument) {
          deferred.reject(new Error('Could not open file!'));
          return;
        }

        window.showTextDocument(textDocument).then(editor => {
          if (!editor) {
            deferred.reject(new Error('Could not show document!'));
            return;
          }

          deferred.resolve(editor);
        });
      });

      return deferred.promise;
    });
  }

  private normalizeDotPath(filePath: string): string {
    const currentFileName: string = window.activeTextEditor
      ? window.activeTextEditor.document.fileName
      : '';
    const directory =
      currentFileName.length > 0
        ? path.dirname(currentFileName)
        : workspace.rootPath;

    return path.resolve(directory, filePath);
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
    return process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];
  }
}
