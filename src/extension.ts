/// <reference path="../typings/tsd.d.ts" />

import { ExtensionContext, commands, window, workspace, QuickPickItem, QuickPickOptions } from 'vscode'; 
import * as fs from 'fs';
import * as path from 'path';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';

export function activate(context: ExtensionContext) {

	console.log('Your extension "vscode-new-file" is now active!'); 

	let disposable = commands.registerCommand('extension.createNewFile', () => {
    
    const currentFileName = window.activeTextEditor.document.fileName;
    const ext = path.extname(currentFileName) || '.ts';
    
    window.showInputBox({
      prompt: 'What\'s the path and name of the new file?',
      value: `newFile${ext}`
    }).then((relativeFilePath) => {
      if (!relativeFilePath) {
        return;
      }
      
      determineFullPath(relativeFilePath)
        .then(createFile)
        .then(changeToFile);
    })
	});
  
  function createFile(newFileName) {
    const deferred = Q.defer<string>();
    let dirname = path.dirname(newFileName);
    let fileExists = fs.existsSync(newFileName);
    
    if (!fileExists) {
      let err = mkdirp.sync(dirname);
      
      fs.writeFile(newFileName, '', (err) => {
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
	
  function changeToFile(fileName) {
    workspace.openTextDocument(fileName).then((textDocument) => {
      window.showTextDocument(textDocument).then((editor) => {
        return editor;
      });
    });
  }
  
  function determineFullPath(filePath) {
    const deferred = Q.defer<string>();
    const root = workspace.rootPath;
    
    if (root) {
      deferred.resolve(path.join(root, filePath))
    }
    
    const options: QuickPickOptions = { 
      matchOnDescription: true,
      placeHolder: "You don't have a project open. Should we use your home path?"
    };
    const homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    let suggestedPath = path.join(homePath, filePath);
    
    const choices: QuickPickItem[] = [
      { label: 'Yes', description: `Use ${suggestedPath}.`},
      { label: 'No', description: 'Let me declare the absolute path.'}
    ];
    
    window.showQuickPick(choices, options).then((choice) => {
      if (!choice) {
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
  
	context.subscriptions.push(disposable);
}