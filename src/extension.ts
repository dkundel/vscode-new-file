import { commands, ExtensionContext, window } from 'vscode';
import * as Debug from 'debug';

import { FileController } from './file-controller';

const debug = Debug('vscode-new-file');

export function activate(context: ExtensionContext) {
  debug('Your extension "vscode-new-file" is now active!');

  let disposable = commands.registerCommand(
    'newFile.createNewFile',
    async () => {
      const File = new FileController().readSettings();

      try {
        let root = await File.determineRoot();
        let defaultFileName = await File.getDefaultFileValue(root);
        let userFilePath = await File.showFileNameDialog(defaultFileName);
        let createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );

  context.subscriptions.push(disposable);

  let disposableDeprecated = commands.registerCommand(
    'extension.createNewFile',
    async () => {
      window.showWarningMessage(
        'You are using a deprecated event. Please switch your keyboard shortcut to use "newFile.createNewFile"'
      );
      const File = new FileController().readSettings();

      try {
        let root = await File.determineRoot();
        let defaultFileName = await File.getDefaultFileValue(root);
        let userFilePath = await File.showFileNameDialog(defaultFileName);
        let createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );

  context.subscriptions.push(disposableDeprecated);

  let disposableExplorerEntry = commands.registerCommand(
    'newFile.createFromExplorer',
    async file => {
      if (!file || !file.path) {
        return;
      }

      const File = new FileController().readSettings();

      try {
        let root = await File.getRootFromExplorerPath(file.path);
        let defaultFileName = await File.getDefaultFileValue(root);
        let userFilePath = await File.showFileNameDialog(defaultFileName, true);
        let createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );
}
