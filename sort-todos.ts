import { Editor, EditorPosition } from "obsidian";

function isTask(line: string): boolean {
  return line.trimStart().startsWith("- [");
}

export interface EditorWrapper {
  getCurrentLine(): number;
  getLine(n: number): string;
  lineCount(): number;
  replaceRange(s: string, start: EditorPosition, end: EditorPosition): void;
}

export interface Context {
  warn(s: string): void;
}

export function sortTodos(editor: EditorWrapper, context: Context) {
  // 1. Get the current cursor position.
  // const currentLine = editor.getCursor().line;
  const currentLine = editor.getCurrentLine();

  if (!isTask(editor.getLine(currentLine))) {
    // new Notice("Not in a task block.");
    context.warn("Not in a task block");
    return;
  }

  // 2. Go up lines until we run out of todos.
  let firstLine = currentLine;

  while (firstLine > 0) {
    if (isTask(editor.getLine(firstLine - 1))) {
      firstLine -= 1;
    } else {
      break;
    }
  }

  const startingLoc = { ch: 0, line: firstLine };

  // 3. Go down lines until we run out of todos.
  let lastLine = currentLine;

  while (lastLine < editor.lineCount()) {
    if (isTask(editor.getLine(lastLine + 1))) {
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
    } else if (trimmedLine.includes("#today")) {
      listToday.push(line);
    } else {
      listOther.push(line);
    }
  }

  const sortedList = listToday.concat(listOther, listDone);

  // 5. Replace the text.
  editor.replaceRange(sortedList.join("\n"), startingLoc, endingLoc);
}