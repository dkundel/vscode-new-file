import {
    commands,
    ExtensionContext,
    QuickPickItem,
    QuickPickOptions,
    TextEditor,
    window,
    workspace
} from "vscode";

import * as fs from "fs";
import * as path from "path";
import { denodeify } from "q";
import * as mkdirp from "mkdirp";
import * as Debug from "debug";
import * as braces from "braces";
import { fileExists } from "./utils";

const debug = Debug("vscode-new-file");

const mkdir = denodeify(mkdirp);
const readFile = denodeify(fs.readFile);
const appendFile = denodeify(fs.appendFile);
const fsStat = denodeify(fs.stat);

type PathName = string;

export interface NewFileSettings {
    showPathRelativeTo: "root" | "project" | "none";
    relativeTo: "root" | "project" | "file";
    rootDirectory: string;
    defaultFileExtension: string;
    defaultBaseFileName: string;
    expandBraces: boolean;
    fileTemplates: { [extension: string]: PathName };
    useFileTemplates: boolean;
}

export class FileController {
    private settings: NewFileSettings;

    private rootPath: string;

    public readSettings(): FileController {
        let config = workspace.getConfiguration("newFile");

        this.settings = {
            showPathRelativeTo: config.get("showPathRelativeTo", "root"),
            relativeTo: config.get("relativeTo", "file"),
            rootDirectory: config.get("rootDirectory", this.homedir()),
            defaultFileExtension: config.get("defaultFileExtension", ".ts"),
            defaultBaseFileName: config.get("defaultBaseFileName", "newFile"),
            expandBraces: config.get("expandBraces", false),
            fileTemplates: config.get("fileTemplates", {}),
            useFileTemplates: config.get("useFileTemplates", true)
        };

        const showFullPath = config.get("showFullPath") as boolean | undefined;
        if (showFullPath) {
            window.showInformationMessage(
                'You are using a deprecated option "showFullPath". Switch instead to "showFullPathRelativeTo"'
            );
            this.settings.showPathRelativeTo = "root";
        }

        return this;
    }

    public async getRootFromExplorerPath(filePath: string): Promise<string> {
        let dir = path.dirname(filePath);
        const stats = (await fsStat(dir)) as fs.Stats;
        if (!stats.isDirectory()) {
            dir = path.resolve(dir, "..");
        }

        this.rootPath = dir;

        return dir;
    }

    public determineRoot(): string {
        let root: string;

        if (this.settings.relativeTo === "project") {
            root = workspace.rootPath;
        } else if (this.settings.relativeTo === "file") {
            if (window.activeTextEditor) {
                root = path.dirname(window.activeTextEditor.document.fileName);
            } else if (workspace.rootPath) {
                root = workspace.rootPath;
            }
        }

        if (!root) {
            root = this.settings.rootDirectory;

            if (root.indexOf("~") === 0) {
                root = path.join(this.homedir(), root.substr(1));
            }
        }

        this.rootPath = root;

        return root;
    }

    public getDefaultFileValue(root: string): string {
        const newFileName = this.settings.defaultBaseFileName;
        const defaultExtension = this.settings.defaultFileExtension;

        const currentFileName: string = window.activeTextEditor
            ? window.activeTextEditor.document.fileName
            : "";
        const ext: string = path.extname(currentFileName) || defaultExtension;

        if (this.settings.showPathRelativeTo !== "none") {
            const fullPath = path.join(root, `${newFileName}${ext}`);
            if (this.settings.showPathRelativeTo === "project") {
                return fullPath.replace(workspace.rootPath + path.sep, "");
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
            question += " (Relative to selected file)";
        } else if (this.settings.showPathRelativeTo === "none") {
            if (this.settings.relativeTo === "project") {
                question += " (Relative to project root)";
            } else if (this.settings.relativeTo === "file") {
                question += " (Relative to current file)";
            }
        } else if (this.settings.showPathRelativeTo === "project") {
            question += " (Relative to project root)";
        }
        const selectionBoundsForFileName: [number, number] = [
            defaultFileValue.lastIndexOf("/") + 1,
            defaultFileValue.lastIndexOf(".")
        ];
        let selectedFilePath = await window.showInputBox({
            prompt: question,
            value: defaultFileValue,
            valueSelection: selectionBoundsForFileName
        });
        if (
            selectedFilePath === null ||
            typeof selectedFilePath === "undefined"
        ) {
            throw undefined;
        }
        selectedFilePath = selectedFilePath || defaultFileValue;
        if (selectedFilePath) {
            if (selectedFilePath.startsWith("./")) {
                return this.normalizeDotPath(selectedFilePath);
            } else {
                if (this.settings.showPathRelativeTo !== "none") {
                    if (this.settings.showPathRelativeTo === "project") {
                        selectedFilePath = path.resolve(
                            workspace.rootPath,
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
        const fileCreationPromises: Promise<
            string
        >[] = newFileNames.map(fileName => this.createFile(fileName));
        return Promise.all(fileCreationPromises);
    }

    public async createFile(newFileName: string): Promise<string> {
        let dirname: string = path.dirname(newFileName);
        let extension: string = path.extname(newFileName);
        let doesFileExist: boolean = await fileExists(newFileName);

        if (!doesFileExist) {
            await mkdir(dirname);

            let content = "";
            let templatePath = this.settings.fileTemplates[extension];
            if (this.settings.useFileTemplates && templatePath !== undefined) {
                content = (await readFile(
                    path.resolve(this.settings.rootDirectory, templatePath),
                    "utf8"
                )) as string;
            }

            await appendFile(newFileName, content);
        }

        return newFileName;
    }

    public openFilesInEditor(fileNames: string[]): Promise<TextEditor>[] {
        return fileNames.map(async fileName => {
            const stats = (await fsStat(fileName)) as fs.Stats;

            if (stats.isDirectory()) {
                window.showInformationMessage(
                    "This file is already a directory. Try a different name."
                );
                return;
            }

            const textDocument = await workspace.openTextDocument(fileName);
            if (!textDocument) {
                throw new Error("Could not open file!");
            }

            const editor = window.showTextDocument(textDocument);
            if (!editor) {
                throw new Error("Could not show document!");
            }

            return editor;
        });
    }

    private normalizeDotPath(filePath: string): string {
        const currentFileName: string = window.activeTextEditor
            ? window.activeTextEditor.document.fileName
            : "";
        const directory =
            currentFileName.length > 0
                ? path.dirname(currentFileName)
                : workspace.rootPath;

        return path.resolve(directory, filePath);
    }

    private getFullPath(root: string, filePath: string): string {
        if (filePath.indexOf("/") === 0) {
            return filePath;
        }

        if (filePath.indexOf("~") === 0) {
            return path.join(this.homedir(), filePath.substr(1));
        }

        return path.resolve(root, filePath);
    }

    private homedir(): string {
        return process.env[
            process.platform == "win32" ? "USERPROFILE" : "HOME"
        ];
    }
}
