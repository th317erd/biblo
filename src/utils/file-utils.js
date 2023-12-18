import Path       from 'node:path';
import FileSystem from 'node:fs';

export function findFileBackwards(_startDir, fileName) {
  let startDir = Path.resolve(_startDir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let filePath = Path.join(startDir, fileName);
    if (FileSystem.existsSync(filePath))
      return filePath;

    startDir = Path.dirname(startDir);
    if (!startDir || startDir === Path.sep || startDir === '.')
      break;
  }
}

export function loadFileContent(filePath) {
  return FileSystem.readFileSync(filePath, 'utf8');
}

export function loadJSON(filePath) {
  let content = loadFileContent(filePath);
  let func    = new Function(`return ${content.replace(/\s*return\s+/, '')}`);
  return func();
}
