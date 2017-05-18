import {
  commands,
  ExtensionContext,
  window
} from 'vscode'
import * as Debug from 'debug';

import { FileController } from './file-controller';

const debug = Debug('vscode-new-file');

export function activate(context: ExtensionContext) {
  debug('Your extension "vscode-new-file" is now active!');

  let disposable = commands.registerCommand('newFile.createNewFile', () => {

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

  let disposableDeprecated = commands.registerCommand('extension.createNewFile', () => {
    window.showWarningMessage('You are using a deprecated event. Please switch your keyboard shortcut to use "newFile.createNewFile"');
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

  context.subscriptions.push(disposableDeprecated);
}