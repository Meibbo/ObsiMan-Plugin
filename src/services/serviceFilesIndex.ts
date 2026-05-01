import type { App } from 'obsidian';
import type { FileNode, IFilesIndex } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createFilesIndex(app: App): IFilesIndex {
  return createNodeIndex<FileNode>({
    build: () =>
      app.vault.getMarkdownFiles().map((file) => ({
        id: file.path,
        path: file.path,
        basename: file.basename,
        file,
      })),
  });
}
