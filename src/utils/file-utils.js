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
