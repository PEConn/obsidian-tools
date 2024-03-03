import {describe, expect, test } from '@jest/globals'
import { EditorPosition } from "obsidian";
import { Context, EditorWrapper, sortTodos } from "./sort-todos";

class TestEditor implements EditorWrapper {
    _contents: string[];
    _currentLine: number;

    setLine(currentLine: number) { this._currentLine = currentLine; }

    constructor(contents: string, currentLine: number = 0) {
        this._currentLine = currentLine;
        this._contents = contents.split("\n");
    }

    getCurrentLine(): number {
        return this._currentLine;
    }

    getLine(n: number): string {
        return this._contents[n];
    }

    lineCount(): number {
        return this._contents.length;
    }

    getContents(): string {
        return this._contents.join("\n");
    }

    replaceRange(s: string, start: EditorPosition, end: EditorPosition): void {
        // Can't be bothered making it work more generally for now.
        if (start.ch !== 0) {
            throw new Error("Start position must have ch == 0.");
        }
        if (end.ch !== this.getLine(end.line).length) {
            throw new Error("End position must have ch == line length.")
        }


        const newContents = [];
        
        // Add the lines above.
        for (let i = 0; i < start.line; i++) {
            newContents.push(this._contents[i]);
        }

        // Add the new lines.
        const newLines = s.split('\n');

        for (let i = 0; i < newLines.length; i++) {
            newContents.push(newLines[i]);
        }

        // Add the lines below.
        for (let i = end.line + 1; i < this.lineCount(); i++) {
            newContents.push(this._contents[i]);
        }

        this._contents = newContents;
    }

    replaceLines(s: string, firstLine: number, lastLine: number): void {
        const startPosition = {
            line: firstLine,
            ch: 0
        };
        const endPosition = {
            line: lastLine,
            ch: this.getLine(lastLine).length
        }

        this.replaceRange(s, startPosition, endPosition);
    }
}

class TestContext implements Context {
    _lastWarning: string;

    warn(s: string): void {
        this._lastWarning = s;
    }

    hasWarning(): boolean {
        return this._lastWarning !== undefined;
    }
}

// npm test -- sort-todos.test.ts
describe('TestEditor', () => {
    test('correct number of lines', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        expect(editor.lineCount()).toBe(3);
    })

    test('getLine', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        expect(editor.getLine(0)).toBe("line 1");
        expect(editor.getLine(1)).toBe("line 2");
        expect(editor.getLine(2)).toBe("line 3");
    })

    test('replaceRange with three lines', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        editor.replaceLines("line 4\nline 5\nline 6", 1, 1);

        expect(editor.getContents()).toBe("line 1\nline 4\nline 5\nline 6\nline 3");
    })

    test('replaceRange with two lines', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        editor.replaceLines("line 4\nline 5", 1, 1);
        expect(editor.getContents()).toBe("line 1\nline 4\nline 5\nline 3");
    })

    test('replaceRange with one lines', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        editor.replaceLines("line 4", 1, 1);
        expect(editor.getContents()).toBe("line 1\nline 4\nline 3");
    })

    test('replaceRange multiple lines', () => {
        const editor = new TestEditor("line 1\nline 2\nline 3");
        editor.replaceLines("line 3", 0, 2);
        expect(editor.getContents()).toBe("line 3");
    })
})

describe('Sort Todos', () => {
    test('smoke test', () => {
        const input = `
        - [x] Done
        - [ ] Not done
        - [ ] Today #today
        `.replace(/^ +/gm, '');

        const expected = `
        - [ ] Today #today
        - [ ] Not done
        - [x] Done
        `.replace(/^ +/gm, '');

        const editor = new TestEditor(input, 1);
        const context = new TestContext();

        sortTodos(editor, context);

        expect(context._lastWarning).toBe(undefined);
        expect(editor.getContents()).toBe(expected);
    })
});