import {
  commands,
  ExtensionContext,
  QuickPickItem,
  QuickPickOptions,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from 'vscode';

import * as braces from 'braces';
import * as Debug from 'debug';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import { denodeify } from 'q';
import { fileExists } from './utils';

const debug = Debug('vscode-new-file');

const mkdir = denodeify(mkdirp);
const readFile = denodeify(fs.readFile);
const appendFile = denodeify(fs.appendFile);
const fsStat = denodeify(fs.stat);

type PathName = string;

export interface NewFileSettings {
  defaultBaseFileName: string;
  defaultFileExtension: string;
  expandBraces: boolean;
  fileTemplates: { [extension: string]: PathName };
  relativeTo: 'file' | 'project' | 'root';
  rootDirectory: string;
  showPathRelativeTo: 'none' | 'project' | 'root';
  useCurrentFileExtension: boolean;
  useFileTemplates: boolean;
}

export class FileController {
  private settings: NewFileSettings;

  private rootPath: string;
  private currentUri?: Uri;
  private workspaceRoot?: string;

  public readSettings(currentUri?: Uri): FileController {
    this.currentUri = currentUri || this.getUriOfCurrentFile();
    const config = workspace.getConfiguration('newFile', this.currentUri);

    this.settings = {
      defaultBaseFileName: config.get('defaultBaseFileName', 'newFile'),
      defaultFileExtension: config.get('defaultFileExtension', '.ts'),
      expandBraces: config.get('expandBraces', false),
      fileTemplates: config.get('fileTemplates', {}),
      relativeTo: config.get('relativeTo', 'file'),
      rootDirectory: config.get('rootDirectory', this.homedir()),
      showPathRelativeTo: config.get('showPathRelativeTo', 'root'),
      useCurrentFileExtension: config.get('useCurrentFileExtension', true),
      useFileTemplates: config.get('useFileTemplates', true),
    };

    const showFullPath = config.get('showFullPath') as boolean | undefined;
    if (showFullPath !== undefined) {
      window.showInformationMessage(
        'You are using a deprecated option "showFullPath". Switch instead to "showPathRelativeTo"'
      );
      this.settings.showPathRelativeTo = 'root';
    }

    return this;
  }

  public async getRootFromExplorerPath(filePath: string): Promise<string> {
    let dir = path.dirname(filePath);
    const stats = (await fsStat(dir)) as fs.Stats;
    if (!stats.isDirectory()) {
      dir = path.resolve(dir, '..');
    }

    this.rootPath = dir;

    return dir;
  }

  public async determineRoot(): Promise<string> {
    let root: string;

    if (this.settings.relativeTo === 'project') {
      this.workspaceRoot = await this.determineWorkspaceRoot();
      root = this.workspaceRoot;
    } else if (this.settings.relativeTo === 'file') {
      if (window.activeTextEditor) {
        root = path.dirname(window.activeTextEditor.document.fileName);
      } else {
        this.workspaceRoot = await this.determineWorkspaceRoot();
        root = this.workspaceRoot;
      }
    }

    if (!root) {
      root = this.settings.rootDirectory;

      if (root.indexOf('~') === 0) {
        root = path.join(this.homedir(), root.substr(1));
      }
    }

    this.rootPath = root;

    return root;
  }

  public async getDefaultFileValue(root: string): Promise<string> {
    const newFileName = this.settings.defaultBaseFileName;
    const defaultExtension = this.settings.defaultFileExtension;
    const useCurrentFileExtension = this.settings.useCurrentFileExtension;

    const currentFileName: string = window.activeTextEditor
      ? window.activeTextEditor.document.fileName
      : '';
    const ext: string = useCurrentFileExtension
      ? path.extname(currentFileName)
      : defaultExtension;

    if (this.settings.showPathRelativeTo !== 'none') {
      const fullPath = path.join(root, `${newFileName}${ext}`);
      if (this.settings.showPathRelativeTo === 'project') {
        if (!this.workspaceRoot) {
          this.workspaceRoot = await this.determineWorkspaceRoot();
        }
        return fullPath.replace(this.workspaceRoot + path.sep, '');
      }
      return fullPath;
    } else {
      return `${newFileName}${ext}`;
    }
  }

  public async showFileNameDialog(
    defaultFileValue: string,
    fromExplorer: boolean = false
  ): Promise<string> {
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
    const selectionBoundsForFileName: [number, number] = [
      defaultFileValue.lastIndexOf(path.sep) + 1,
      defaultFileValue.lastIndexOf('.'),
    ];
    let selectedFilePath = await window.showInputBox({
      prompt: question,
      value: defaultFileValue,
      valueSelection: selectionBoundsForFileName,
    });
    if (selectedFilePath === null || typeof selectedFilePath === 'undefined') {
      throw undefined;
    }
    selectedFilePath = selectedFilePath || defaultFileValue;
    if (selectedFilePath) {
      if (selectedFilePath.startsWith('./')) {
        return this.normalizeDotPath(selectedFilePath);
      } else {
        if (this.settings.showPathRelativeTo !== 'none') {
          if (this.settings.showPathRelativeTo === 'project') {
            if (!this.workspaceRoot) {
              this.workspaceRoot = await this.determineWorkspaceRoot();
            }
            selectedFilePath = path.resolve(
              this.workspaceRoot,
              selectedFilePath
            );
          }
          return selectedFilePath;
        } else {
          return this.getFullPath(this.rootPath, selectedFilePath);
        }
      }
    }
  }

  public async createFiles(userEntry: string): Promise<string[]> {
    if (!this.settings.expandBraces) {
      return Promise.all([this.createFile(userEntry)]);
    }

    const newFileNames = braces.expand(userEntry);
    const fileCreationPromises: Array<
      Promise<string>
    > = newFileNames.map(fileName => this.createFile(fileName));
    return Promise.all(fileCreationPromises);
  }

  public async createFile(newFileName: string): Promise<string> {
    const dirname: string = path.dirname(newFileName);
    const extension: string = path.extname(newFileName);
    const doesFileExist: boolean = await fileExists(newFileName);

    if (!doesFileExist) {
      await mkdir(dirname);

      let content = '';
      const templatePath = this.settings.fileTemplates[extension];
      if (this.settings.useFileTemplates && templatePath !== undefined) {
        content = (await readFile(
          path.resolve(this.settings.rootDirectory, templatePath),
          'utf8'
        )) as string;
      }

      await appendFile(newFileName, content);
    }

    return newFileName;
  }

  public openFilesInEditor(fileNames: string[]): Array<Promise<TextEditor>> {
    return fileNames.map(async fileName => {
      const stats = (await fsStat(fileName)) as fs.Stats;

      if (stats.isDirectory()) {
        window.showInformationMessage(
          'This file is already a directory. Try a different name.'
        );
        return;
      }

      const textDocument = await workspace.openTextDocument(fileName);
      if (!textDocument) {
        throw new Error('Could not open file!');
      }

      const editor = window.showTextDocument(textDocument);
      if (!editor) {
        throw new Error('Could not show document!');
      }

      return editor;
    });
  }

  private async normalizeDotPath(filePath: string): Promise<string> {
    const currentFileName: string = window.activeTextEditor
      ? window.activeTextEditor.document.fileName
      : '';
    if (!this.workspaceRoot) {
      this.workspaceRoot = await this.determineWorkspaceRoot();
    }
    const directory =
      currentFileName.length > 0
        ? path.dirname(currentFileName)
        : this.workspaceRoot;

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

  private getUriOfCurrentFile(): Uri | undefined {
    const editor = window.activeTextEditor;
    return editor ? editor.document.uri : undefined;
  }

  private async determineWorkspaceFolder(
    currentUri: Uri
  ): Promise<WorkspaceFolder | undefined> {
    if (currentUri) {
      return workspace.getWorkspaceFolder(currentUri);
    }

    const selectedWorkspaceFolder = await window.showWorkspaceFolderPick();
    if (selectedWorkspaceFolder !== undefined) {
      this.readSettings(selectedWorkspaceFolder.uri);
    }
    return selectedWorkspaceFolder;
  }

  private getRootPathFromWorkspace(
    currentWorkspace?: WorkspaceFolder
  ): string | undefined | null {
    if (typeof currentWorkspace === 'undefined') {
      return undefined;
    }

    if (currentWorkspace.uri.scheme !== 'file') {
      return null;
    }

    return currentWorkspace.uri.fsPath;
  }

  private async determineWorkspaceRoot(): Promise<string | undefined> {
    const currentWorkspace = await this.determineWorkspaceFolder(
      this.currentUri
    );
    const workspaceRoot = this.getRootPathFromWorkspace(currentWorkspace);
    if (workspaceRoot === null) {
      throw new Error(
        'This extension currently only support file system workspaces.'
      );
    }
    return workspaceRoot;
  }

  private homedir(): string {
    return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  }
}
