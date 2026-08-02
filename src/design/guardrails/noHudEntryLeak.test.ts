import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENTRY = path.join(SRC, "hud.tsx");

// The HUD is a standalone Vite entry (hud.html) so the overlay window doesn't
// boot the editor SPA. App.tsx is the window-type dispatcher and
// components/video-editor is the editor surface; either reaching the HUD would
// pull the whole editor bundle into the lightweight window. Anything the HUD
// needs from those has to be extracted into a shared module first.
const FORBIDDEN_ROOTS = [path.join(SRC, "App.tsx"), path.join(SRC, "components", "video-editor")];

// Runtime imports only: `import type` and type-only named imports are erased at
// compile time, so they add no bytes to the HUD bundle and can't pull editor
// code into the window. Dynamic `import()` is allowed too — it never blocks
// startup. Only value imports (the things the compiler leaves behind) matter.
function runtimeImportsOf(file: string): string[] {
	const source = fs.readFileSync(file, "utf8");
	const program = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
	const specifiers = new Set<string>();

	for (const statement of program.statements) {
		if (ts.isImportDeclaration(statement)) {
			const clause = statement.importClause;
			if (clause?.isTypeOnly) continue;
			if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
				if (clause.namedBindings.elements.every((element) => element.isTypeOnly)) continue;
			}
		} else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
			if (statement.isTypeOnly) continue;
			if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
				if (statement.exportClause.elements.every((element) => element.isTypeOnly)) continue;
			}
		} else {
			continue;
		}

		const moduleSpecifier = statement.moduleSpecifier;
		if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) continue;
		specifiers.add(moduleSpecifier.text);
	}

	return [...specifiers];
}

function tryResolve(base: string): string | null {
	const candidates = [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.js`,
		path.join(base, "index.ts"),
		path.join(base, "index.tsx"),
	];

	return (
		candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ??
		null
	);
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
	if (specifier.startsWith("./") || specifier.startsWith("../")) {
		return tryResolve(path.resolve(path.dirname(fromFile), specifier));
	}
	if (specifier.startsWith("@/")) {
		return tryResolve(path.resolve(SRC, specifier.slice(2)));
	}

	return null; // bare specifier (package) — outside the internal graph
}

function internalGraph(): Set<string> {
	const visited = new Set<string>();
	const queue = [ENTRY];

	while (queue.length > 0) {
		const file = queue.shift();
		if (!file || visited.has(file)) continue;
		visited.add(file);

		for (const specifier of runtimeImportsOf(file)) {
			const resolved = resolveSpecifier(file, specifier);
			if (resolved && resolved.startsWith(SRC)) {
				queue.push(resolved);
			}
		}
	}

	return visited;
}

describe("HUD entry isolation", () => {
	const graph = internalGraph();

	it("walks a real graph, so a broken resolver can't pass silently", () => {
		expect(fs.existsSync(ENTRY)).toBe(true);
		expect(graph.size).toBeGreaterThan(5);
	});

	it("actually mounts the HUD surface", () => {
		expect(graph.has(path.join(SRC, "components", "launch", "LaunchWindow.tsx"))).toBe(true);
	});

	it("does not pull the editor SPA (App.tsx or components/video-editor)", () => {
		const leaks = [...graph].filter((file) =>
			FORBIDDEN_ROOTS.some((root) => file === root || file.startsWith(`${root}${path.sep}`)),
		);

		expect(leaks).toEqual([]);
	});
});
