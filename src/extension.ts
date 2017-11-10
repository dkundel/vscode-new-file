import * as Debug from 'debug';
import { commands, ExtensionContext, window } from 'vscode';

import { FileController } from './file-controller';

const debug = Debug('vscode-new-file');

export function activate(context: ExtensionContext) {
  debug('Your extension "vscode-new-file" is now active!');

  const disposable = commands.registerCommand(
    'newFile.createNewFile',
    async () => {
      const File = new FileController().readSettings();

      try {
        const root = await File.determineRoot();
        const defaultFileName = await File.getDefaultFileValue(root);
        const userFilePath = await File.showFileNameDialog(defaultFileName);
        const createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err && err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );

  context.subscriptions.push(disposable);

  const disposableDeprecated = commands.registerCommand(
    'extension.createNewFile',
    async () => {
      window.showWarningMessage(
        'You are using a deprecated event. Please switch your keyboard shortcut to use "newFile.createNewFile"'
      );
      const File = new FileController().readSettings();

      try {
        const root = await File.determineRoot();
        const defaultFileName = await File.getDefaultFileValue(root);
        const userFilePath = await File.showFileNameDialog(defaultFileName);
        const createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err && err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );

  context.subscriptions.push(disposableDeprecated);

  const disposableExplorerEntry = commands.registerCommand(
    'newFile.createFromExplorer',
    async file => {
      if (!file || !file.path) {
        return;
      }

      const File = new FileController().readSettings();

      try {
        const root = await File.getRootFromExplorerPath(file.path);
        const defaultFileName = await File.getDefaultFileValue(root);
        const userFilePath = await File.showFileNameDialog(
          defaultFileName,
          true
        );
        const createdFiles = await File.createFiles(userFilePath);
        await File.openFilesInEditor(createdFiles);
      } catch (err) {
        if (err && err.message) {
          window.showErrorMessage(err.message);
        }
      }
    }
  );
}
