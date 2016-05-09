/// <reference path="../typings/tsd.d.ts" />

require('expect.js');

import * as vscode from 'vscode';
import * as extension from '../src/extension';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';

const testResourcesPath = path.join(__dirname, 'test-resources');

suite('Extension Tests', () => {
  setup(() => {
    mkdirp.sync(testResourcesPath);
    fs.writeFileSync(path.join(testResourcesPath, 'existingFile.ts'), 'Existing File!');
  });
  
  teardown(() => {
    if (testResourcesPath !== '/') {
      rimraf.sync(testResourcesPath); 
    }
  });

  suite('testing createFile method', () => {
    let tests = [
      { fileName: 'existingFile.ts', content: 'Existing File!' },
      { fileName: 'newFile.ts', content: '' },
      { fileName: 'nested/newFile.ts', content: '' }
    ];
    
    tests.forEach((t) => {
      test(`testing '${t.fileName}'`, () => {
        const File = new extension.FileController();
        const filePath = path.join(testResourcesPath, t.fileName);
        
        File.createFile(filePath)
          .then((returnedFileName) => {
            expect(returnedFileName).to.be(filePath);
            expect(fs.existsSync(filePath)).to.be(true);
            expect(fs.readFileSync(filePath)).to.be(t.content);
          });
      });
    });
  });
});