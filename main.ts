import {
  Editor,
  EditorPosition,
  Menu,
  Notice,
  Plugin,
  WorkspaceLeaf,
  TAbstractFile
} from 'obsidian';
import { sortTodos } from 'sort-todos';
import { transferTodos } from 'transfer-todos';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

interface FileData {
  created: number
}

type FileDataMap = {
  [path: string]: FileData
}

interface FileItem {
  titleEl?: HTMLElement;
  selfEl: HTMLElement;
}

const archiveRoot = "4 - archive";

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile, source: string, leaf: WorkspaceLeaf | undefined) => {
      if (file.path === archiveRoot) return;

      const inArchive = file.path.startsWith(archiveRoot + "/");

      menu.addItem((item) => {
        const title = inArchive ? "Unarchive" : "Archive";
        const icon = inArchive ? "archive-restore" : "archive";

        item.setTitle(title)
        .setIcon(icon)
        .onClick(() => {
          const dest = inArchive ? file.path.substring(archiveRoot.length + 1) : archiveRoot + "/" + file.path;

          this.moveToDest(file, dest);
        })
      })
    })

    this.addCommand({
      id: "sort-tasks",
      name: "Sort Tasks",
      editorCallback: (editor: Editor) => { this.sortTodos(editor); }
    });

    this.addCommand({
      id: "transfer-tasks",
      name: "Transfer tasks",
      editorCallback: (editor: Editor) => { this.transferTodos(editor); }
    })

    this.setUiAttributes();
  }

  private sortTodos(editor: Editor) {
    const editorWrapper = {
      getCurrentLine() { return editor.getCursor().line; },
      getLine(n: number): string { return editor.getLine(n) },
      lineCount() { return editor.lineCount() },
      replaceRange(s: string, from: EditorPosition, to: EditorPosition) { editor.replaceRange(s, from, to) },
    }

    const context = {
      warn(s: string) { new Notice(s);}
    }

    sortTodos(editorWrapper, context);
  }

  private transferTodos(editor: Editor) {
    const editorWrapper = {
      getCurrentLine() { return editor.getCursor().line; },
      getLine(n: number): string { return editor.getLine(n) },
      lineCount() { return editor.lineCount() },
      replaceRange(s: string, from: EditorPosition, to: EditorPosition) { editor.replaceRange(s, from, to) },
    }

    const context = {
      warn(s: string) { new Notice(s);}
    }

    transferTodos(editorWrapper, context);
  }

  private async moveToDest(file: TAbstractFile, dest: string) {
    // It seems on windows (where the path separater is '\') the files still use '/' as the separater.
    const pathSep = "/";
    const parts = dest.split(pathSep);

    let pathSoFar = "";
    for (let i = 0; i < parts.length - 1; i++) {
      try {
        pathSoFar += parts[i];
        console.log("Creating " + pathSoFar);
        await this.app.vault.createFolder(pathSoFar);
      } catch (err) {
        // The folder already exists.
      } finally {
        pathSoFar += pathSep;
      }
    }

    try {
      await this.app.vault.rename(file, dest);
    } catch (err) {
      new Notice("Failed.");
      console.log(err);
    }
  }

  public async setUiAttributes() {
    try {
      await this.setUiAttributesInner();
    } catch (err) {
      console.log(err);
      console.log("Trying again");
      setTimeout(() => {
        this.setUiAttributes();
      }, 500)
    }
  }

  public async setUiAttributesInner() {
    const fileExplorerLeaf = await this.getFileExplorerLeaf();

    const fileDataMap: FileDataMap = {};

    this.app.vault.getFiles().forEach((file) => {
      fileDataMap[file.path] = { created: file.stat.ctime }
    });

    console.log(fileDataMap);

    const fileItems: { [path: string]: FileItem } = (
      fileExplorerLeaf.view as any
    ).fileItems;

    for (const path in fileItems) {
      const item = fileItems[path];

      if (fileDataMap[path]) {
        (item.titleEl ?? item.selfEl).setAttribute(
          "peters-tool-date",
          new Date(fileDataMap[path].created).toLocaleDateString(),
        );
      } else {
        console.log("Could not find " + path);
      }
    }
  }

  private async getFileExplorerLeaf(): Promise<WorkspaceLeaf> {
    return new Promise((resolve, reject) => {
      let foundLeaf: WorkspaceLeaf | null = null;
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (foundLeaf) {
          return;
        }

        const view = leaf.view as any;
        if (!view || !view.fileItems) {
          return;
        }

        foundLeaf = leaf;
        resolve(foundLeaf);
        console.log("Found File Explorer Leaf");
      });

      if (!foundLeaf) {
        reject(Error("Could not find file explorer leaf."));
      }
    });
  }


  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
