import { Context, EditorWrapper } from "sort-todos";

interface Section {
    name: string,
    startLine: number,
    endLine: number
}

export function findTopLevelSection(
        name: string, editor: EditorWrapper, context: Context): Section | null {
    let foundStart = false;
    let startLine = 0;
    let endLine = editor.lineCount() - 1;

    for (let i = 0; i < editor.lineCount(); i++) {
        const line = editor.getLine(i);
        if (!line.startsWith("# ")) continue;

        if (line === `# ${name}`) {
            if (foundStart) {
                context.warn(`Found multiple sections titled "${name}"`);
                return null;
            }

            foundStart = true;
            startLine = i;
        } else {
            if (foundStart) {
                endLine = i - 1;
                break;
            }
        }
    }

    if (foundStart) {
        return { name, startLine, endLine }
    } else {
        context.warn(`Couldn't find section "${name}"`);
        return null;
    }
}

export function transferTodos(editor: EditorWrapper, context: Context) {
    // 1. Find the "# Tasks" section.
    const section = findTopLevelSection("Tasks", editor, context);

    if (section == null) {
        return;
    }

    // 2. Go through each line:
    //   add to next week, all lines that are *not*:
    //     - [x] - done.
    //     - [<] - backlogged.
    //     - [-] - cancelled.
    //   add to the backlog, all lines that are:
    //     - [<] - backlogged.

    const backlog: string[] = [];
    const nextWeek: string[] = [];
    const nextWeekExcludes = ["- [x]", "- [<]", "- [-]"];

    // starting at "startLine + 1" so we ignore the "# Tasks".
    for (let i = section.startLine + 1; i <= section.endLine; i++) {
        const line = editor.getLine(i);

        if (line.trim().startsWith("- [<]")) {
            backlog.push(line.replace("- [<]", "- [ ]"));
        }

        if (!nextWeekExcludes.includes(line.trim().substring(0, "- [?]".length))) {
            nextWeek.push(line.replace("- [>]", "- [ ]"));
        }
    }

    const result = [
        "",
        "## Next Week",
        ...nextWeek,
        "",
        "## Backlog",
        ...backlog,
        ""
    ].join("\n");
    
    const line = section.endLine;
    const ch = editor.getLine(line).length;
    editor.replaceRange(result, { line, ch }, { line, ch })
}