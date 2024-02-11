import {
  Editor,
	Menu,
	Notice,
	Plugin,
	WorkspaceLeaf,
	TAbstractFile
} from 'obsidian';

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
    })

		this.setUiAttributes();
	}

  private sortTodos(editor: Editor) {
    console.log("Sorting...");

    // 1. Get the current cursor position.
    const currentLine = editor.getCursor().line;

    if (!MyPlugin.isTask(editor.getLine(currentLine))) {
      new Notice("Not in a task block.");
      return;
    }

    // 2. Go up lines until we run out of todos.
    let firstLine = currentLine;

    while (firstLine > 0) {
      if (MyPlugin.isTask(editor.getLine(firstLine - 1))) {
        firstLine -= 1;
      } else {
        break;
      }
    }

    const startingLoc = { ch: 0, line: firstLine };

    // 3. Go down lines until we run out of todos.
    let lastLine = currentLine;

    while (lastLine < editor.lineCount()) {
      if (MyPlugin.isTask(editor.getLine(lastLine + 1))) {
        lastLine += 1;
      } else {
        break;
      }
    }

    const endingLoc = { ch: editor.getLine(lastLine).length, line: lastLine }

    // 4. Rearrange.
    const listToday = [];
    const listOther = [];
    const listDone = [];

    for (let i = firstLine; i <= lastLine; i++) {
      const line = editor.getLine(i);
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith("- [x]")) {
        listDone.push(line);
      } else if (trimmedLine.contains("#today")) {
        listToday.push(line);
      } else {
        listOther.push(line);
      }
    }

    const sortedList = listToday.concat(listOther, listDone);

    // 5. Replace the text.
    editor.replaceRange(sortedList.join("\n"), startingLoc, endingLoc);
  }

  private static isTask(line: string): boolean {
    return line.trimStart().startsWith("- [");
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
