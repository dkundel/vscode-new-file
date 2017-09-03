import * as fs from 'fs';

export function fileExists(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.exists(path, exists => {
      resolve(exists);
    });
  });
}
