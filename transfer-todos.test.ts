import { describe, expect, test } from '@jest/globals'
import { EditorPosition } from "obsidian";
import { Context, EditorWrapper } from "./sort-todos";
import { TestContext, TestEditor } from './sort-todos.test';
import { findTopLevelSection, transferTodos } from './transfer-todos';

describe('Transfer Todos', () => {
    test('find section', () => {
        const input = `
        # Something

        # Tasks

        # Something Else
        `.replace(/^ +/gm, '');

        const editor = new TestEditor(input, 1);
        const context = new TestContext();

        const section = findTopLevelSection("Tasks", editor, context);

        expect(section?.name).toBe("Tasks");
        expect(section?.startLine).toBe(3);
        expect(section?.endLine).toBe(4);
    })

    test('find section to end of file', () => {
        const input = `
        # Something

        # Tasks

        `.replace(/^ +/gm, '');

        const editor = new TestEditor(input, 1);
        const context = new TestContext();

        const section = findTopLevelSection("Tasks", editor, context);

        expect(section?.name).toBe("Tasks");
        expect(section?.startLine).toBe(3);
        expect(section?.endLine).toBe(5);
    })

    test('smoke test', () => {
        const input = `
        # Tasks
        High priority:
        - [x] Done
        - [>] Carry over
        - [ ] Forgot about
        
        Medium priority:
        - [-] Can't be bothered
        - [<] Leave it for now

        # Other stuff
        `.replace(/^ +/gm, '');

        const expected = `
        # Tasks
        High priority:
        - [x] Done
        - [>] Carry over
        - [ ] Forgot about
        
        Medium priority:
        - [-] Can't be bothered
        - [<] Leave it for now

        ## Next Week
        High priority:
        - [ ] Carry over
        - [ ] Forgot about
        
        Medium priority:


        ## Backlog
        - [ ] Leave it for now

        # Other stuff
        `.replace(/^ +/gm, '');

        const editor = new TestEditor(input, 1);
        const context = new TestContext();

        transferTodos(editor, context);
        expect(editor.getContents()).toBe(expected);
    })
});