import { commands, ExtensionContext, window } from 'vscode';
import * as Debug from 'debug';

import { FileController } from './file-controller';

const debug = Debug('vscode-new-file');

export function activate(context: ExtensionContext) {
  debug('Your extension "vscode-new-file" is now active!');

  let disposable = commands.registerCommand('newFile.createNewFile', () => {
    const File = new FileController().readSettings();

    File.determineRoot()
      .then(root => File.getDefaultFileValue(root))
      .then(fileName => File.showFileNameDialog(fileName))
      .then(fileName => File.createFiles(fileName))
      .then(File.openFilesInEditor)
      .catch(err => {
        if (err.message) {
          window.showErrorMessage(err.message);
        }
      });
  });

  context.subscriptions.push(disposable);

  let disposableDeprecated = commands.registerCommand(
    'extension.createNewFile',
    () => {
      window.showWarningMessage(
        'You are using a deprecated event. Please switch your keyboard shortcut to use "newFile.createNewFile"'
      );
      const File = new FileController().readSettings();

      File.determineRoot()
        .then(root => File.getDefaultFileValue(root))
        .then(fileName => File.showFileNameDialog(fileName))
        .then(fileName => File.createFiles(fileName))
        .then(File.openFilesInEditor)
        .catch(err => {
          if (err.message) {
            window.showErrorMessage(err.message);
          }
        });
    }
  );

  context.subscriptions.push(disposableDeprecated);

  let disposableExplorerEntry = commands.registerCommand(
    'newFile.createFromExplorer',
    file => {
      if (!file || !file.path) {
        return;
      }

      const File = new FileController().readSettings();

      File.getRootFromExplorerPath(file.path)
        .then(root => File.getDefaultFileValue(root))
        .then(fileName => File.showFileNameDialog(fileName, true))
        .then(File.createFile)
        .then(fileName => File.createFiles(fileName))
        .catch(err => {
          if (err.message) {
            window.showErrorMessage(err.message);
          }
        });
    }
  );
}
