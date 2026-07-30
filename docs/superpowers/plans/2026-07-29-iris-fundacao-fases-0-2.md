# Íris — Fundação (Fases 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrumentar o Íris com orçamentos de performance que quebram o CI, remover o peso morto do runtime, e construir a camada de design verificável sobre a qual todas as telas serão reconstruídas.

**Architecture:** Três fases sequenciais. A Fase 0 mede o app como ele é hoje e congela esses números como baseline versionado — sem ela, nenhum ganho posterior é demonstrável. A Fase 1 corta dependências mortas, elimina requisições de rede no boot e reduz o custo de processo do Electron. A Fase 2 constrói a camada de design (tokens, fonte, ícones, vidro, motion) com guardrails automáticos, sem alterar nenhuma tela existente. Cada tarefa termina com teste verde e commit.

**Tech Stack:** Electron 41, React 18, TypeScript 5.9 (strict), Vite 7, Vitest 4 (jsdom + browser/Playwright), Playwright 1.59, Tailwind 3.4, Biome 2.4, Node 22.22.1.

## Global Constraints

- **Nenhuma feature de `README.md#core-features` pode ser removida ou degradada.** Se um corte de dependência ameaçar uma feature, a dependência é substituída, não deletada.
- **As três plataformas continuam suportadas** (macOS, Windows, Linux). Nenhum código de plataforma é removido.
- **Nenhum ativo, fonte ou biblioteca de ícones da Apple** entra no repositório. A estética é replicada por implementação própria.
- **Nenhuma biblioteca de animação de UI.** Motion de interface é CSS/WAAPI, restrito a `transform` e `opacity`.
- **TypeScript strict, sem `any` novo.** Biome `noExplicitAny` é `warn` — não adicionar novos.
- **Estilo Biome:** tabs, aspas duplas, largura 100 colunas, LF. Rodar `npm run lint:fix` antes de cada commit.
- **Testes ficam ao lado do código** como `*.test.ts` / `*.test.tsx`. Testes de browser usam sufixo `*.browser.test.ts`.
- **Valores de design vêm literalmente de `DESIGN.md`** — hex, px, ms e curvas são exatos, nunca aproximados.
- **Node 22.22.1** tem type stripping nativo ligado por padrão: scripts `.ts` rodam com `node arquivo.ts` sem transpilar.
- **Commits:** sumário imperativo curto. Prefixos conventional-commits (`feat:`, `fix:`, `perf:`, `test:`, `chore:`, `docs:`, `build:`, `ci:`).
- **Branch:** trabalhar em `lite-base` ou branch derivada. Nunca commitar direto em `main`.

---

## Estrutura de arquivos

**Fase 0 — instrumentação**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/perf/budgets.ts` | Comparar medições contra orçamentos e formatar violações. Puro, sem I/O. |
| `src/lib/perf/bundleSize.ts` | Normalizar nomes de chunk com hash e agregar bytes por chunk. Puro. |
| `src/lib/perf/appMetrics.ts` | Agregar métricas de processo do Electron em RSS total. Puro. |
| `src/lib/perf/renderCounter.tsx` | Utilitário de teste que conta renders de uma subárvore React. |
| `scripts/bench/bundle.ts` | CLI: lê `dist/assets`, mede, compara com budgets, sai 1 em violação. |
| `scripts/bench/startup.ts` | CLI: sobe o Electron headless, mede spawn → primeiro frame do HUD. |
| `scripts/bench/memory.ts` | CLI: sobe o Electron headless, mede RSS somado em ocioso. |
| `perf-budgets.json` | Orçamentos versionados. Fonte única de verdade dos limites. |
| `.github/workflows/ci.yml` | Job `perf` novo. |

**Fase 1 — poda e Electron**

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/perf/dependencyGuard.ts` | Lista de dependências banidas e verificação contra `package.json`. Puro. |
| `src/lib/spring.ts` | Integrador de mola próprio, substituindo `motion`. |
| `src/styles/fonts/annotation-fonts.css` | `@font-face` locais das 16 famílias de anotação, sem rede. |
| `electron/throttlePolicy.ts` | Decide quais janelas podem dormir, dado o estado do app. Puro. |
| `electron/windows.ts` | Consome a política; ganha `sandbox`. |
| `electron/fuses.ts` | Configuração de Electron Fuses aplicada no empacotamento. |
| `electron-builder.json5` | Filtro de `onnxruntime-node` por plataforma. |

**Fase 2 — camada de design**

| Arquivo | Responsabilidade |
|---|---|
| `src/design/tokens/color.ts` | Tokens de cor de `DESIGN.md` §3. |
| `src/design/tokens/typography.ts` | Escala tipográfica de §4. |
| `src/design/tokens/space.ts` | Escala de espaçamento e raios de §5/§6. |
| `src/design/tokens/motion.ts` | Curvas e durações de §8. |
| `src/design/tokens/index.ts` | Reexporta tudo como um objeto único. |
| `src/design/tokens/toCss.ts` | Serializa tokens em custom properties CSS. |
| `src/design/contrast.ts` | Razão de contraste WCAG. Puro. |
| `src/design/glass/Glass.tsx` | Primitiva de vidro com as 3 camadas de §5. |
| `src/design/motion/animate.ts` | Helpers WAAPI com respeito a `prefers-reduced-motion`. |
| `src/design/icons/Icon.tsx` | Componente de ícone sobre sprite SVG. |
| `src/design/icons/sprite.svg` | Símbolos desenhados na grade de 20×20. |
| `src/design/guardrails/*.test.ts` | Testes que falham o build em violação de `DESIGN.md`. |
| `scripts/generate-design-css.ts` | Gera `src/design/tokens.generated.css` a partir dos tokens TS. |

---

# FASE 0 — Baseline e instrumentação

Nenhuma linha de código de produto muda nesta fase. A entrega é a capacidade de medir.

---

### Task 1: Verificador de orçamentos

**Files:**
- Create: `src/lib/perf/budgets.ts`
- Test: `src/lib/perf/budgets.test.ts`
- Modify: `vitest.config.ts:8` (incluir `scripts` no glob de testes)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type BudgetUnit = "bytes" | "ms" | "count"`
  - `interface Budget { metric: string; max: number; unit: BudgetUnit }`
  - `interface Measurement { metric: string; value: number }`
  - `interface Violation { metric: string; value: number; max: number; unit: BudgetUnit }`
  - `function findViolations(measurements: Measurement[], budgets: Budget[]): Violation[]`
  - `function formatViolations(violations: Violation[]): string`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/perf/budgets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type Budget, findViolations, formatViolations, type Measurement } from "./budgets";

const budgets: Budget[] = [
	{ metric: "bundle.pixi.js", max: 600_000, unit: "bytes" },
	{ metric: "startup.hudFirstFrame", max: 2_000, unit: "ms" },
];

describe("findViolations", () => {
	it("returns nothing when every measurement is within budget", () => {
		const measurements: Measurement[] = [
			{ metric: "bundle.pixi.js", value: 540_000 },
			{ metric: "startup.hudFirstFrame", value: 1_800 },
		];

		expect(findViolations(measurements, budgets)).toEqual([]);
	});

	it("reports a measurement that exceeds its budget", () => {
		const measurements: Measurement[] = [{ metric: "bundle.pixi.js", value: 640_000 }];

		expect(findViolations(measurements, budgets)).toEqual([
			{ metric: "bundle.pixi.js", value: 640_000, max: 600_000, unit: "bytes" },
		]);
	});

	it("treats a measurement exactly at the budget as passing", () => {
		const measurements: Measurement[] = [{ metric: "bundle.pixi.js", value: 600_000 }];

		expect(findViolations(measurements, budgets)).toEqual([]);
	});

	it("flags a measurement that has no budget, so new chunks can't slip in unmeasured", () => {
		const measurements: Measurement[] = [{ metric: "bundle.mystery.js", value: 1 }];

		expect(findViolations(measurements, budgets)).toEqual([
			{ metric: "bundle.mystery.js", value: 1, max: 0, unit: "count" },
		]);
	});
});

describe("formatViolations", () => {
	it("renders one human-readable line per violation", () => {
		const output = formatViolations([
			{ metric: "bundle.pixi.js", value: 640_000, max: 600_000, unit: "bytes" },
		]);

		expect(output).toBe("bundle.pixi.js: 640000 bytes exceeds budget of 600000 bytes");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/budgets.test.ts`
Expected: FAIL — `Failed to resolve import "./budgets"`.

- [ ] **Step 3: Implementar**

Criar `src/lib/perf/budgets.ts`:

```ts
export type BudgetUnit = "bytes" | "ms" | "count";

export interface Budget {
	metric: string;
	max: number;
	unit: BudgetUnit;
}

export interface Measurement {
	metric: string;
	value: number;
}

export interface Violation {
	metric: string;
	value: number;
	max: number;
	unit: BudgetUnit;
}

/**
 * A measurement with no matching budget is a violation, not a pass: an unbudgeted
 * chunk is exactly how weight creeps back in unnoticed.
 */
export function findViolations(measurements: Measurement[], budgets: Budget[]): Violation[] {
	const byMetric = new Map(budgets.map((budget) => [budget.metric, budget]));

	return measurements.flatMap((measurement) => {
		const budget = byMetric.get(measurement.metric);

		if (!budget) {
			return [{ metric: measurement.metric, value: measurement.value, max: 0, unit: "count" }];
		}

		if (measurement.value <= budget.max) {
			return [];
		}

		return [
			{
				metric: measurement.metric,
				value: measurement.value,
				max: budget.max,
				unit: budget.unit,
			},
		];
	});
}

export function formatViolations(violations: Violation[]): string {
	return violations
		.map(
			(violation) =>
				`${violation.metric}: ${violation.value} ${violation.unit} exceeds budget of ${violation.max} ${violation.unit}`,
		)
		.join("\n");
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/budgets.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Incluir `scripts/` no glob do Vitest**

Em `vitest.config.ts`, trocar a linha `include`:

```ts
		include: [
			"{src,electron,scripts,.github}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
		],
```

- [ ] **Step 6: Rodar a suíte inteira e o lint**

Run: `npm run test && npm run lint`
Expected: PASS, sem regressão nos 57 arquivos de teste existentes.

- [ ] **Step 7: Commit**

```bash
git add src/lib/perf/budgets.ts src/lib/perf/budgets.test.ts vitest.config.ts
git commit -m "test: add performance budget checker"
```

---

### Task 2: Medição de tamanho de bundle

**Files:**
- Create: `src/lib/perf/bundleSize.ts`
- Test: `src/lib/perf/bundleSize.test.ts`

**Interfaces:**
- Consumes: `Measurement` de `src/lib/perf/budgets.ts`.
- Produces:
  - `function chunkNameFromFile(fileName: string): string`
  - `interface AssetFile { name: string; bytes: number }`
  - `function toMeasurements(files: AssetFile[]): Measurement[]`

O Vite emite nomes com hash (`VideoEditor-DHSCG_Jh.js`). O orçamento precisa de um nome estável, então o hash é removido antes de comparar.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/perf/bundleSize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type AssetFile, chunkNameFromFile, toMeasurements } from "./bundleSize";

describe("chunkNameFromFile", () => {
	it("strips the Vite content hash so budgets survive a rebuild", () => {
		expect(chunkNameFromFile("VideoEditor-DHSCG_Jh.js")).toBe("VideoEditor.js");
		expect(chunkNameFromFile("index-ByNYrzXz.css")).toBe("index.css");
	});

	it("keeps names that carry no hash", () => {
		expect(chunkNameFromFile("manifest.json")).toBe("manifest.json");
	});

	it("keeps hyphenated names whose last segment is not a hash", () => {
		expect(chunkNameFromFile("gif-worker.js")).toBe("gif-worker.js");
	});
});

describe("toMeasurements", () => {
	it("prefixes every chunk with bundle. and sums duplicates of the same chunk", () => {
		const files: AssetFile[] = [
			{ name: "pixi-BXozQCwi.js", bytes: 530_000 },
			{ name: "pixi-Zaaaaaaa.js", bytes: 1_000 },
			{ name: "index-ByNYrzXz.css", bytes: 74_000 },
		];

		expect(toMeasurements(files)).toEqual([
			{ metric: "bundle.pixi.js", value: 531_000 },
			{ metric: "bundle.index.css", value: 74_000 },
			{ metric: "bundle.total", value: 605_000 },
		]);
	});

	it("adds a total across every asset", () => {
		const files: AssetFile[] = [
			{ name: "a-AAAAAAAA.js", bytes: 10 },
			{ name: "b-BBBBBBBB.js", bytes: 20 },
		];

		expect(toMeasurements(files)).toContainEqual({ metric: "bundle.total", value: 30 });
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/bundleSize.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/lib/perf/bundleSize.ts`:

```ts
import type { Measurement } from "./budgets";

export interface AssetFile {
	name: string;
	bytes: number;
}

// Vite hashes are base64url-ish, 8 chars, appended after the last hyphen.
const HASHED_NAME = /^(.*)-[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/;

export function chunkNameFromFile(fileName: string): string {
	const match = HASHED_NAME.exec(fileName);

	return match ? `${match[1]}${match[2]}` : fileName;
}

export function toMeasurements(files: AssetFile[]): Measurement[] {
	const byChunk = new Map<string, number>();
	let total = 0;

	for (const file of files) {
		const metric = `bundle.${chunkNameFromFile(file.name)}`;

		byChunk.set(metric, (byChunk.get(metric) ?? 0) + file.bytes);
		total += file.bytes;
	}

	return [
		...Array.from(byChunk, ([metric, value]) => ({ metric, value })),
		{ metric: "bundle.total", value: total },
	];
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/bundleSize.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perf/bundleSize.ts src/lib/perf/bundleSize.test.ts
git commit -m "test: measure bundle chunk sizes with stable names"
```

---

### Task 3: CLI de orçamento de bundle

**Files:**
- Create: `scripts/bench/bundle.ts`
- Create: `perf-budgets.json`
- Modify: `package.json` (script `bench:bundle`)

**Interfaces:**
- Consumes: `toMeasurements` (Task 2), `findViolations`/`formatViolations` (Task 1).
- Produces: comando `npm run bench:bundle`, e o arquivo `perf-budgets.json` no formato `{ "budgets": Budget[] }`.

- [ ] **Step 1: Criar o arquivo de orçamentos com um teto propositalmente frouxo**

Criar `perf-budgets.json`. Os valores definitivos entram na Task 8, depois da medição real; aqui só existe a estrutura.

```json
{
	"budgets": [
		{ "metric": "bundle.total", "max": 4000000, "unit": "bytes" }
	]
}
```

- [ ] **Step 2: Escrever o CLI**

Criar `scripts/bench/bundle.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { type AssetFile, toMeasurements } from "../../src/lib/perf/bundleSize.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ASSETS_DIR = path.join(ROOT, "dist/assets");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");

function readAssets(): AssetFile[] {
	if (!fs.existsSync(ASSETS_DIR)) {
		throw new Error(`No build output at ${ASSETS_DIR}. Run "npx vite build" first.`);
	}

	return fs
		.readdirSync(ASSETS_DIR)
		.filter((name) => name.endsWith(".js") || name.endsWith(".css"))
		.map((name) => ({ name, bytes: fs.statSync(path.join(ASSETS_DIR, name)).size }));
}

function readBudgets(): Budget[] {
	const parsed = JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] };

	return parsed.budgets;
}

const measurements = toMeasurements(readAssets());

for (const measurement of measurements) {
	console.info(`${measurement.metric} = ${measurement.value}`);
}

const violations = findViolations(
	measurements,
	readBudgets().filter((budget) => budget.metric.startsWith("bundle.")),
);

if (violations.length > 0) {
	console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
	process.exit(1);
}

console.info("\nAll bundle budgets are within limits.");
```

- [ ] **Step 3: Registrar o script**

Em `package.json`, dentro de `"scripts"`, depois de `"build-vite"`:

```json
		"bench:bundle": "node scripts/bench/bundle.ts",
```

- [ ] **Step 4: Rodar e observar a falha esperada por chunk sem orçamento**

Run: `npx vite build && npm run bench:bundle`
Expected: exit 1, listando cada chunk como violação sem orçamento (`max: 0`) — é o comportamento correto da Task 1 antes da Task 8 preencher os limites.

- [ ] **Step 5: Commit**

```bash
git add scripts/bench/bundle.ts perf-budgets.json package.json
git commit -m "ci: add bundle size budget command"
```

---

### Task 4: Agregação de métricas de processo

**Files:**
- Create: `src/lib/perf/appMetrics.ts`
- Test: `src/lib/perf/appMetrics.test.ts`

**Interfaces:**
- Consumes: `Measurement` de Task 1.
- Produces:
  - `interface ProcessMetric { type: string; memory: { workingSetSize: number } }`
  - `function totalResidentKb(metrics: ProcessMetric[]): number`
  - `function residentByTypeKb(metrics: ProcessMetric[]): Record<string, number>`
  - `function toMemoryMeasurements(metrics: ProcessMetric[], phase: string): Measurement[]`

`app.getAppMetrics()` do Electron devolve `workingSetSize` em kilobytes. A agregação fica pura para poder ser testada sem Electron.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/perf/appMetrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	type ProcessMetric,
	residentByTypeKb,
	toMemoryMeasurements,
	totalResidentKb,
} from "./appMetrics";

const metrics: ProcessMetric[] = [
	{ type: "Browser", memory: { workingSetSize: 120_000 } },
	{ type: "Tab", memory: { workingSetSize: 80_000 } },
	{ type: "Tab", memory: { workingSetSize: 60_000 } },
	{ type: "GPU", memory: { workingSetSize: 40_000 } },
];

describe("totalResidentKb", () => {
	it("sums every process, because a window we forgot still costs memory", () => {
		expect(totalResidentKb(metrics)).toBe(300_000);
	});

	it("returns zero for no processes", () => {
		expect(totalResidentKb([])).toBe(0);
	});
});

describe("residentByTypeKb", () => {
	it("groups by process type so renderer growth is visible on its own", () => {
		expect(residentByTypeKb(metrics)).toEqual({ Browser: 120_000, Tab: 140_000, GPU: 40_000 });
	});
});

describe("toMemoryMeasurements", () => {
	it("emits a total and a per-type metric namespaced by phase", () => {
		expect(toMemoryMeasurements(metrics, "idle")).toEqual([
			{ metric: "memory.idle.total", value: 300_000 },
			{ metric: "memory.idle.Browser", value: 120_000 },
			{ metric: "memory.idle.Tab", value: 140_000 },
			{ metric: "memory.idle.GPU", value: 40_000 },
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/appMetrics.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/lib/perf/appMetrics.ts`:

```ts
import type { Measurement } from "./budgets";

/** Shape of one entry from Electron's `app.getAppMetrics()`. Sizes are in kilobytes. */
export interface ProcessMetric {
	type: string;
	memory: { workingSetSize: number };
}

export function totalResidentKb(metrics: ProcessMetric[]): number {
	return metrics.reduce((sum, metric) => sum + metric.memory.workingSetSize, 0);
}

export function residentByTypeKb(metrics: ProcessMetric[]): Record<string, number> {
	const byType: Record<string, number> = {};

	for (const metric of metrics) {
		byType[metric.type] = (byType[metric.type] ?? 0) + metric.memory.workingSetSize;
	}

	return byType;
}

export function toMemoryMeasurements(metrics: ProcessMetric[], phase: string): Measurement[] {
	return [
		{ metric: `memory.${phase}.total`, value: totalResidentKb(metrics) },
		...Object.entries(residentByTypeKb(metrics)).map(([type, value]) => ({
			metric: `memory.${phase}.${type}`,
			value,
		})),
	];
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/appMetrics.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perf/appMetrics.ts src/lib/perf/appMetrics.test.ts
git commit -m "test: aggregate electron process memory metrics"
```

---

### Task 5: CLI de startup e memória

**Files:**
- Create: `scripts/bench/closeElectron.ts`
- Create: `scripts/bench/runtime.ts`
- Modify: `package.json` (script `bench:runtime`)

**Interfaces:**
- Consumes: `toMemoryMeasurements` (Task 4), `findViolations`/`formatViolations` (Task 1).
- Produces: comando `npm run bench:runtime`, emitindo as métricas `startup.hudFirstFrame` (ms) e `memory.idle.*` (kb).

Reaproveita o padrão de lançamento já usado em `tests/e2e/gif-export.spec.ts:17-30`: Playwright `_electron` com `HEADLESS=true`, `--no-sandbox` e `--enable-unsafe-swiftshader`.

- [ ] **Step 0: Escrever o desligamento garantido, compartilhado pelos dois CLIs de runtime**

Criar `scripts/bench/closeElectron.ts`:

```ts
import { spawnSync } from "node:child_process";
import type { ElectronApplication } from "@playwright/test";

/**
 * Shuts the app down on every path, including failures. Playwright's launch
 * spawns Electron as an independent subprocess: if a measurement throws and
 * nothing kills it, the orphan keeps running and the next run's idle memory
 * sample measures the leak too. Mirrors the teardown in
 * tests/e2e/gif-export.spec.ts.
 */
export async function closeElectron(app: ElectronApplication): Promise<void> {
	const electronProcess = app.process();

	await app.close().catch(() => {
		// Already gone, or never became responsive — the kill below is the backstop.
	});

	const pid = electronProcess.pid;

	if (!pid || electronProcess.killed) {
		return;
	}

	if (process.platform === "win32") {
		spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
	} else {
		try {
			electronProcess.kill("SIGKILL");
		} catch {
			// The process exited between the check and the signal.
		}
	}
}
```

- [ ] **Step 1: Escrever o CLI**

Criar `scripts/bench/runtime.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "@playwright/test";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { type ProcessMetric, toMemoryMeasurements } from "../../src/lib/perf/appMetrics.ts";
import { closeElectron } from "./closeElectron.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");
// Memory settles for a moment after the HUD paints; sampling too early
// reports a number the user never actually experiences.
const IDLE_SETTLE_MS = 3_000;

async function main() {
	if (!fs.existsSync(MAIN_JS)) {
		throw new Error(`No main process build at ${MAIN_JS}. Run "npx vite build" first.`);
	}

	const startedAt = Date.now();

	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: { ...process.env, HEADLESS: "true" },
	});

	let hudFirstFrameMs: number;
	let processMetrics: ProcessMetric[];

	// Everything after launch runs under a finally: a measurement that throws
	// (HUD never appears, evaluate rejects) must not leave an orphaned Electron
	// behind, or the next run's idle memory sample is measuring the leak too.
	try {
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");
		await hudWindow.evaluate(
			() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
		);

		hudFirstFrameMs = Date.now() - startedAt;

		await new Promise((resolve) => setTimeout(resolve, IDLE_SETTLE_MS));

		processMetrics = (await app.evaluate(({ app: electronApp }) =>
			electronApp.getAppMetrics(),
		)) as ProcessMetric[];
	} finally {
		await closeElectron(app);
	}

	const measurements = [
		{ metric: "startup.hudFirstFrame", value: hudFirstFrameMs },
		...toMemoryMeasurements(processMetrics, "idle"),
	];

	for (const measurement of measurements) {
		console.info(`${measurement.metric} = ${measurement.value}`);
	}

	const budgets = (JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] })
		.budgets;
	const relevant = budgets.filter(
		(budget) => budget.metric.startsWith("startup.") || budget.metric.startsWith("memory."),
	);
	const measured = measurements.filter((measurement) =>
		relevant.some((budget) => budget.metric === measurement.metric),
	);
	const violations = findViolations(measured, relevant);

	if (violations.length > 0) {
		console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
		process.exit(1);
	}

	console.info("\nAll runtime budgets are within limits.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
```

Nota sobre o filtro `measured`: aqui, ao contrário do bundle, métricas sem orçamento são ignoradas em vez de reprovadas — a lista de processos varia por plataforma e um tipo novo de processo do Chromium não deve quebrar o build.

- [ ] **Step 2: Registrar o script**

Em `package.json`, logo abaixo de `bench:bundle`:

```json
		"bench:runtime": "node scripts/bench/runtime.ts",
```

- [ ] **Step 3: Rodar e conferir que emite números**

Run: `npx vite build && npm run bench:runtime`
Expected: imprime `startup.hudFirstFrame`, `memory.idle.total` e as métricas por tipo de processo, e termina com "All runtime budgets are within limits." (nenhum orçamento de runtime existe ainda).

Se o Electron não subir por falta de display, prefixar com `xvfb-run -a`.

- [ ] **Step 4: Commit**

```bash
git add scripts/bench/runtime.ts package.json
git commit -m "ci: add startup and idle memory benchmark"
```

---

### Task 6: Contador de renders para cenários de UI

**Files:**
- Create: `src/lib/perf/renderCounter.tsx`
- Test: `src/lib/perf/renderCounter.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `function createRenderCounter(): { count: () => number; reset: () => void; Probe: () => null }`

`Probe` é um componente que incrementa o contador a cada render. Montado dentro da subárvore sob teste, mede quantas vezes aquela subárvore re-renderizou.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/perf/renderCounter.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createRenderCounter } from "./renderCounter";

describe("createRenderCounter", () => {
	it("counts the initial render", () => {
		const counter = createRenderCounter();

		render(<counter.Probe />);

		expect(counter.count()).toBe(1);
	});

	it("counts a re-render caused by a parent state change", () => {
		const counter = createRenderCounter();
		let setValue: (value: number) => void = () => {};

		function Parent() {
			const [value, set] = useState(0);
			setValue = set;

			return (
				<div data-value={value}>
					<counter.Probe />
				</div>
			);
		}

		render(<Parent />);
		expect(counter.count()).toBe(1);

		setValue(1);
		expect(counter.count()).toBe(2);
	});

	it("resets back to zero", () => {
		const counter = createRenderCounter();

		render(<counter.Probe />);
		counter.reset();

		expect(counter.count()).toBe(0);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/renderCounter.test.tsx`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/lib/perf/renderCounter.tsx`:

```tsx
/**
 * Test-only helper. Mount `Probe` inside the subtree under test and assert on
 * `count()` to pin down how often that subtree re-renders. Used by the render
 * budgets: the playback path is meant to reach zero React renders per frame.
 *
 * Counting happens during render, so under `StrictMode` React's development
 * double-invocation doubles every count. Never mount `Probe` inside a
 * `StrictMode` boundary when asserting a render budget.
 */
export function createRenderCounter(): {
	count: () => number;
	reset: () => void;
	Probe: () => null;
} {
	let renders = 0;

	return {
		count: () => renders,
		reset: () => {
			renders = 0;
		},
		Probe: function Probe() {
			renders += 1;

			return null;
		},
	};
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/renderCounter.test.tsx`
Expected: PASS, 3 testes.

Se o React reclamar de atualização fora de `act`, envolver `setValue(1)` do teste em `act(() => setValue(1))` importado de `@testing-library/react`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perf/renderCounter.tsx src/lib/perf/renderCounter.test.tsx
git commit -m "test: add render counting helper for UI budgets"
```

---

### Task 7: Benchmark de throughput de export

**Files:**
- Create: `scripts/bench/export.ts`
- Modify: `package.json` (script `bench:export`)

**Interfaces:**
- Consumes: `findViolations`/`formatViolations` (Task 1).
- Produces: métrica `export.mp4.msPerSecondOfVideo`.

Usa a mesma fixture do e2e existente (`tests/fixtures/sample.webm`) e o mesmo caminho de export que `tests/e2e/gif-export.spec.ts` exercita.

- [ ] **Step 1: Confirmar que a fixture existe**

Run: `ls -la tests/fixtures/`
Expected: `sample.webm` presente. Se não estiver, parar e reportar — o benchmark depende dela e inventar outra fixture invalidaria a comparação com o baseline.

- [ ] **Step 2: Descobrir a duração real da fixture**

Run: `node -e "const{execSync}=require('child_process');console.log(execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 tests/fixtures/sample.webm').toString())"`

Se `ffprobe` não estiver disponível, abrir a fixture no editor do app e ler a duração da timeline. Anotar o valor em segundos — ele entra no passo 3 como `FIXTURE_SECONDS`.

- [ ] **Step 3: Escrever o CLI**

Criar `scripts/bench/export.ts`. A sequência de disparo do export é a mesma de `tests/e2e/gif-export.spec.ts:40-113`, transportada aqui e cronometrada:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect } from "@playwright/test";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { closeElectron } from "./closeElectron.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const FIXTURE = path.join(ROOT, "tests/fixtures/sample.webm");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");
// Substituir pelo valor medido no passo 2.
const FIXTURE_SECONDS = 5;

async function main() {
	if (!fs.existsSync(FIXTURE)) {
		throw new Error(`Missing fixture ${FIXTURE}`);
	}

	const outputPath = path.join(os.tmpdir(), `iris-bench-export-${Date.now()}.mp4`);

	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: { ...process.env, HEADLESS: "true" },
	});

	// Declared outside the try so the finally can always clean them up, and so
	// the measurement survives past the block that produced it.
	let fixtureCopy = "";
	let elapsedMs: number;

	try {
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");

		// Capture the export completion in the main process instead of writing to
		// disk, so the measurement isn't dominated by the save dialog or filesystem.
		await app.evaluate(({ ipcMain }, targetPath: string) => {
			ipcMain.removeHandler("pick-export-save-path");
			ipcMain.removeHandler("write-export-to-path");
			ipcMain.handle("pick-export-save-path", () => ({
				success: true,
				path: targetPath,
				canceled: false,
			}));
			ipcMain.handle("write-export-to-path", () => {
				(globalThis as Record<string, unknown>)["__benchExportDone"] = true;
				return { success: true, path: targetPath };
			});
		}, outputPath);

		const userDataDir = await app.evaluate(({ app: electronApp }) =>
			electronApp.getPath("userData"),
		);
		const recordingsDir = path.join(userDataDir, "recordings");
		fixtureCopy = path.join(recordingsDir, "bench-sample.webm");
		fs.mkdirSync(recordingsDir, { recursive: true });
		fs.copyFileSync(FIXTURE, fixtureCopy);

		await hudWindow.evaluate(
			(videoPath: string) => window.electronAPI.setCurrentVideoPath(videoPath),
			fixtureCopy,
		);

		try {
			await hudWindow.evaluate(() => window.electronAPI.switchToEditor());
		} catch (error) {
			// The HUD tears down as the editor takes over; that isn't a failure.
			if (
				!(error instanceof Error) ||
				!/closed|destroyed|target page|target closed/i.test(error.message)
			) {
				throw error;
			}
		}

		const editorWindow = await app.waitForEvent("window", {
			predicate: (w) => w.url().includes("windowType=editor"),
			timeout: 15_000,
		});

		// WebCodecs may not be registered in the renderer on first load.
		await editorWindow.reload();
		await editorWindow.waitForLoadState("domcontentloaded");
		await expect(editorWindow.getByText("Loading video...")).not.toBeVisible({ timeout: 15_000 });

		await editorWindow.getByTestId("testId-export-panel-button").click();
		await editorWindow.getByTestId("testId-mp4-format-button").click();

		// The clock starts at the click, not at launch: this measures encoding.
		const startedAt = Date.now();
		await editorWindow.getByTestId("testId-export-button").click();

		await expect
			.poll(
				() =>
					app.evaluate(() =>
						Boolean((globalThis as Record<string, unknown>)["__benchExportDone"]),
					),
				{ timeout: 180_000 },
			)
			.toBe(true);

		elapsedMs = Date.now() - startedAt;
	} finally {
		await closeElectron(app);

		if (fixtureCopy) {
			fs.rmSync(fixtureCopy, { force: true });
		}
	}

	const measurement = {
		metric: "export.mp4.msPerSecondOfVideo",
		value: Math.round(elapsedMs / FIXTURE_SECONDS),
	};

	console.info(`${measurement.metric} = ${measurement.value}`);

	const budgets = (
		JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] }
	).budgets.filter((budget) => budget.metric === measurement.metric);

	if (budgets.length > 0) {
		const violations = findViolations([measurement], budgets);

		if (violations.length > 0) {
			console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
			process.exit(1);
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
```

- [ ] **Step 4: Registrar o script**

```json
		"bench:export": "node scripts/bench/export.ts",
```

- [ ] **Step 5: Rodar**

Run: `npx vite build && npm run bench:export`
Expected: imprime `export.mp4.msPerSecondOfVideo = <n>` e sai 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/bench/export.ts package.json
git commit -m "ci: add mp4 export throughput benchmark"
```

---

### Task 8: Congelar o baseline e ligar o CI

**Files:**
- Modify: `perf-budgets.json`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/superpowers/plans/baseline-2026-07-29.md`
- Modify: `package.json` (script `bench:ci`)

**Interfaces:**
- Consumes: todos os CLIs das Tasks 3, 5 e 7.
- Produces: `perf-budgets.json` preenchido; job `perf` no CI.

- [ ] **Step 1: Medir tudo**

Run:
```bash
npx vite build
npm run bench:bundle | tee /tmp/iris-bundle.txt
npm run bench:runtime | tee /tmp/iris-runtime.txt
npm run bench:export | tee /tmp/iris-export.txt
```

Anotar cada valor impresso.

- [ ] **Step 2: Registrar o baseline**

Criar `docs/superpowers/plans/baseline-2026-07-29.md` com uma tabela `métrica | valor medido | ambiente` contendo todos os valores do passo anterior, mais SO, versão do Node, e commit medido (`git rev-parse --short HEAD`). Este arquivo é histórico e não é atualizado depois.

- [ ] **Step 3: Preencher os orçamentos com folga de 5%**

Substituir `perf-budgets.json` por uma entrada para **cada** métrica medida, com `max` igual ao valor medido arredondado para cima com 5% de folga. Exemplo de forma (números reais vêm do passo 1):

```json
{
	"budgets": [
		{ "metric": "bundle.total", "max": 3600000, "unit": "bytes" },
		{ "metric": "bundle.transformers.js", "max": 860000, "unit": "bytes" },
		{ "metric": "bundle.VideoEditor.js", "max": 760000, "unit": "bytes" },
		{ "metric": "bundle.index.js", "max": 630000, "unit": "bytes" },
		{ "metric": "bundle.pixi.js", "max": 560000, "unit": "bytes" },
		{ "metric": "bundle.react-vendor.js", "max": 470000, "unit": "bytes" },
		{ "metric": "startup.hudFirstFrame", "max": 0, "unit": "ms" },
		{ "metric": "memory.idle.total", "max": 0, "unit": "count" },
		{ "metric": "export.mp4.msPerSecondOfVideo", "max": 0, "unit": "ms" }
	]
}
```

Toda entrada com `max: 0` acima é um marcador: trocar pelo valor medido + 5%. Nenhum `max: 0` pode permanecer no arquivo ao fim desta tarefa. Incluir uma entrada para **todos** os chunks listados por `bench:bundle`, senão o próprio comando reprova por chunk sem orçamento.

- [ ] **Step 4: Confirmar que tudo passa**

Run: `npm run bench:bundle && npm run bench:runtime && npm run bench:export`
Expected: os três saem 0.

- [ ] **Step 5: Registrar o comando agregado**

Em `package.json`:

```json
		"bench:ci": "npm run bench:bundle && npm run bench:runtime",
```

`bench:export` fica fora do CI por ser CPU-bound e lento; roda nos marcos de fase.

- [ ] **Step 6: Adicionar o job ao CI**

Em `.github/workflows/ci.yml`, após o job `build`:

```yaml
  perf:
    name: Performance budgets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: npx vite build
      - run: npm run test:browser:install
      - run: xvfb-run -a npm run bench:ci
```

- [ ] **Step 7: Commit**

```bash
git add perf-budgets.json package.json .github/workflows/ci.yml docs/superpowers/plans/baseline-2026-07-29.md
git commit -m "ci: freeze performance baseline and enforce budgets"
```

---

# FASE 1 — Poda e configuração do Electron

---

### Task 9: Guarda de dependências banidas

**Files:**
- Create: `src/lib/perf/dependencyGuard.ts`
- Test: `src/lib/perf/dependencyGuard.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `const BANNED_DEPENDENCIES: readonly string[]`
  - `function findBannedDependencies(packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }): string[]`

O teste começa **vermelho de propósito** contra o `package.json` real e só fica verde nas Tasks 10–12, quando as dependências saírem. Por isso a asserção contra o arquivo real vive numa tarefa posterior; aqui só existe a função pura.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/perf/dependencyGuard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BANNED_DEPENDENCIES, findBannedDependencies } from "./dependencyGuard";

describe("findBannedDependencies", () => {
	it("reports a banned package found in dependencies", () => {
		expect(findBannedDependencies({ dependencies: { gsap: "^3.15.0", react: "^18.3.1" } })).toEqual(
			["gsap"],
		);
	});

	it("reports a banned package found in devDependencies", () => {
		expect(findBannedDependencies({ devDependencies: { mp4box: "^2.3.0" } })).toEqual(["mp4box"]);
	});

	it("returns nothing for a clean manifest", () => {
		expect(findBannedDependencies({ dependencies: { react: "^18.3.1" } })).toEqual([]);
	});

	it("bans every animation and dead package the audit found", () => {
		expect([...BANNED_DEPENDENCIES].sort()).toEqual([
			"emoji-picker-react",
			"gsap",
			"motion",
			"mp4box",
		]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/dependencyGuard.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/lib/perf/dependencyGuard.ts`:

```ts
/**
 * Packages that must not come back. `gsap`, `emoji-picker-react` and `mp4box`
 * had zero imports when audited; `motion` was used only as a spring integrator,
 * replaced by src/lib/spring.ts. UI motion is CSS/WAAPI by decision.
 */
export const BANNED_DEPENDENCIES = [
	"gsap",
	"motion",
	"emoji-picker-react",
	"mp4box",
] as const satisfies readonly string[];

export function findBannedDependencies(packageJson: {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}): string[] {
	const installed = new Set([
		...Object.keys(packageJson.dependencies ?? {}),
		...Object.keys(packageJson.devDependencies ?? {}),
	]);

	return BANNED_DEPENDENCIES.filter((name) => installed.has(name));
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/dependencyGuard.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/perf/dependencyGuard.ts src/lib/perf/dependencyGuard.test.ts
git commit -m "test: add banned dependency guard"
```

---

### Task 10: Integrador de mola próprio, substituindo `motion`

**Files:**
- Create: `src/lib/spring.ts`
- Test: `src/lib/spring.test.ts`
- Modify: `src/components/video-editor/videoPlayback/motionSmoothing.ts:1,68-84`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `function integrateSpring(params: { value: number; velocity: number; target: number; deltaMs: number; stiffness: number; damping: number; mass: number }): { value: number; velocity: number }`

`motion.spring()` cria um gerador novo **a cada frame** dentro de `stepSpringValue` (`motionSmoothing.ts:68`), no caminho quente do cursor e do zoom. Um integrador semi-implícito de Euler dá o mesmo comportamento sem alocação por frame, e remove a dependência.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/spring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { integrateSpring } from "./spring";

const config = { stiffness: 320, damping: 40, mass: 0.92 };

describe("integrateSpring", () => {
	it("moves toward the target", () => {
		const next = integrateSpring({ value: 0, velocity: 0, target: 100, deltaMs: 16, ...config });

		expect(next.value).toBeGreaterThan(0);
		expect(next.value).toBeLessThan(100);
		expect(next.velocity).toBeGreaterThan(0);
	});

	it("stays put when already at the target with no velocity", () => {
		const next = integrateSpring({ value: 50, velocity: 0, target: 50, deltaMs: 16, ...config });

		expect(next.value).toBeCloseTo(50, 6);
		expect(next.velocity).toBeCloseTo(0, 6);
	});

	it("settles at the target after enough steps instead of oscillating forever", () => {
		let state = { value: 0, velocity: 0 };

		for (let step = 0; step < 400; step += 1) {
			state = integrateSpring({ ...state, target: 100, deltaMs: 16, ...config });
		}

		expect(state.value).toBeCloseTo(100, 1);
		expect(Math.abs(state.velocity)).toBeLessThan(0.5);
	});

	it("is stable across a long frame, so a stutter doesn't fling the value", () => {
		const next = integrateSpring({ value: 0, velocity: 0, target: 100, deltaMs: 250, ...config });

		expect(Number.isFinite(next.value)).toBe(true);
		expect(next.value).toBeLessThanOrEqual(100);
	});

	it("allocates nothing per call beyond its return value", () => {
		const next = integrateSpring({ value: 1, velocity: 2, target: 3, deltaMs: 16, ...config });

		expect(Object.keys(next)).toEqual(["value", "velocity"]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/spring.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/lib/spring.ts`:

```ts
export interface SpringStep {
	value: number;
	velocity: number;
	target: number;
	deltaMs: number;
	stiffness: number;
	damping: number;
	mass: number;
}

// Sub-stepping keeps the integrator stable when a frame runs long: one 250ms
// leap through a stiff spring diverges, ten 25ms steps don't.
const MAX_SUB_STEP_MS = 8;

/**
 * Semi-implicit Euler spring. Replaces `motion`'s spring generator, which
 * allocated a new generator on every frame of the cursor and zoom hot path.
 */
export function integrateSpring(step: SpringStep): { value: number; velocity: number } {
	const subSteps = Math.max(1, Math.ceil(step.deltaMs / MAX_SUB_STEP_MS));
	const dt = step.deltaMs / subSteps / 1000;

	let value = step.value;
	let velocity = step.velocity;

	for (let index = 0; index < subSteps; index += 1) {
		const springForce = -step.stiffness * (value - step.target);
		const dampingForce = -step.damping * velocity;

		velocity += ((springForce + dampingForce) / step.mass) * dt;
		value += velocity * dt;
	}

	return { value, velocity };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/spring.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Trocar o uso em `motionSmoothing.ts`**

Em `src/components/video-editor/videoPlayback/motionSmoothing.ts`, remover `import { spring } from "motion";` da linha 1 e substituir por `import { integrateSpring } from "@/lib/spring";`. Trocar o corpo entre a captura de `previousValue` e o retorno (linhas 67–84) por:

```ts
	const previousValue = state.value;
	const next = integrateSpring({
		value: state.value,
		velocity: state.velocity,
		target,
		deltaMs: safeDeltaMs,
		stiffness: config.stiffness,
		damping: config.damping,
		mass: config.mass,
	});

	const settled =
		Math.abs(target - next.value) <= restDelta && Math.abs(next.velocity) <= restSpeed;

	state.value = settled ? target : next.value;
	state.velocity = settled ? 0 : ((state.value - previousValue) / safeDeltaMs) * 1000;

	return state.value;
```

- [ ] **Step 6: Rodar os testes que já cobrem esse caminho**

Run: `npx vitest --run src/components/video-editor/videoPlayback/zoomSpring.test.ts src/lib/cursor/cursorPathSmoothing.test.ts`
Expected: PASS. Se algum teste assertar valor numérico exato produzido pelo `motion`, ajustar a tolerância do teste para `toBeCloseTo` com 1 casa — a curva é equivalente, os floats não são idênticos. Não relaxar a asserção de convergência.

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/spring.ts src/lib/spring.test.ts src/components/video-editor/videoPlayback/motionSmoothing.ts
git commit -m "perf: replace motion spring generator with allocation-free integrator"
```

---

### Task 11: Remover as dependências mortas

**Files:**
- Modify: `package.json`
- Create: `src/lib/perf/packageManifest.test.ts`

**Interfaces:**
- Consumes: `findBannedDependencies` (Task 9).
- Produces: manifesto sem `gsap`, `motion`, `emoji-picker-react`, `mp4box`.

- [ ] **Step 1: Escrever o teste que falha contra o `package.json` real**

Criar `src/lib/perf/packageManifest.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findBannedDependencies } from "./dependencyGuard";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package.json", () => {
	it("carries no banned dependency", () => {
		const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

		expect(findBannedDependencies(manifest)).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/lib/perf/packageManifest.test.ts`
Expected: FAIL, listando `["gsap", "motion", "emoji-picker-react", "mp4box"]`.

- [ ] **Step 3: Confirmar que nada importa esses pacotes**

Run: `grep -rn "gsap\|emoji-picker-react\|mp4box\|from \"motion" src electron tests`
Expected: nenhuma saída. Se aparecer alguma, **parar** e reportar — remover uma dependência ainda usada quebraria uma feature, o que a restrição global proíbe.

- [ ] **Step 4: Remover**

Run: `npm uninstall gsap motion emoji-picker-react mp4box`

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/lib/perf/packageManifest.test.ts && npm run test && npx tsc --noEmit`
Expected: PASS nos três.

- [ ] **Step 6: Confirmar que os orçamentos não regrediram**

Run: `npx vite build && npm run bench:bundle`
Expected: exit 0, com `bundle.total` igual ou menor que o baseline.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/perf/packageManifest.test.ts
git commit -m "perf: drop unused gsap, motion, emoji-picker-react and mp4box"
```

---

### Task 12: Eliminar a requisição de fontes na inicialização

**Files:**
- Create: `src/styles/fonts/annotation-fonts.css`
- Create: `public/fonts/` (arquivos `.woff2`)
- Create: `src/styles/fonts/annotationFonts.test.ts`
- Modify: `src/index.css:1`

**Interfaces:**
- Consumes: nada.
- Produces: `src/styles/fonts/annotation-fonts.css` com um `@font-face` local por família.

`src/index.css:1` faz um `@import` de 16 famílias do Google Fonts. Num app desktop isso é uma requisição de rede bloqueante no boot de **cada** um dos 5 renderers, e falha offline. As famílias são reais — alimentam o seletor de fonte de anotações em `AnnotationSettingsPanel.tsx:54-83` — então precisam ser **auto-hospedadas**, jamais removidas.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/styles/fonts/annotationFonts.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const ANNOTATION_FAMILIES = [
	"Bebas Neue",
	"Caveat",
	"DM Sans",
	"Fira Code",
	"IBM Plex Mono",
	"IBM Plex Sans",
	"Inter",
	"Lora",
	"Manrope",
	"Merriweather",
	"Oswald",
	"Permanent Marker",
	"Playfair Display",
	"Plus Jakarta Sans",
	"Space Grotesk",
	"Sora",
];

describe("annotation fonts", () => {
	it("are declared locally, one @font-face per family", () => {
		const css = fs.readFileSync(path.join(ROOT, "src/styles/fonts/annotation-fonts.css"), "utf8");

		for (const family of ANNOTATION_FAMILIES) {
			expect(css).toContain(`font-family: "${family}"`);
		}
	});

	it("ship the woff2 files they reference", () => {
		const css = fs.readFileSync(path.join(ROOT, "src/styles/fonts/annotation-fonts.css"), "utf8");
		const referenced = [...css.matchAll(/url\("([^"]+\.woff2)"\)/g)].map((match) => match[1]);

		expect(referenced.length).toBeGreaterThan(0);

		for (const reference of referenced) {
			const file = path.join(ROOT, "public", reference.replace(/^\/+/, ""));

			expect(fs.existsSync(file), `missing font file ${file}`).toBe(true);
		}
	});

	it("never fetch fonts over the network at startup", () => {
		const indexCss = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf8");

		expect(indexCss).not.toContain("fonts.googleapis.com");
		expect(indexCss).not.toContain("fonts.gstatic.com");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/styles/fonts/annotationFonts.test.ts`
Expected: FAIL — `annotation-fonts.css` não existe.

- [ ] **Step 3: Baixar as fontes**

As 16 famílias estão listadas na URL de `src/index.css:1`, com os pesos que o app usa. Baixar os `.woff2` correspondentes (todas são licenciadas SIL OFL ou Apache 2.0, redistribuíveis) para `public/fonts/`, um arquivo por família e peso, nomeados `<familia-kebab>-<peso><-italic>.woff2` — por exemplo `dm-sans-400.woff2`, `dm-sans-700-italic.woff2`, `bebas-neue-400.woff2`.

Registrar as licenças em `public/fonts/LICENSES.md`, uma seção por família com nome, licença e origem.

- [ ] **Step 4: Escrever o CSS local**

Criar `src/styles/fonts/annotation-fonts.css` com um bloco por arquivo baixado. Padrão a repetir:

```css
@font-face {
	font-family: "DM Sans";
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url("/fonts/dm-sans-400.woff2") format("woff2");
}

@font-face {
	font-family: "Bebas Neue";
	font-style: normal;
	font-weight: 400;
	font-display: swap;
	src: url("/fonts/bebas-neue-400.woff2") format("woff2");
}
```

- [ ] **Step 5: Trocar o `@import` remoto pelo local**

Em `src/index.css`, substituir a linha 1 inteira por:

```css
@import "./styles/fonts/annotation-fonts.css";
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/styles/fonts/annotationFonts.test.ts`
Expected: PASS, 3 testes.

- [ ] **Step 7: Verificar manualmente que o seletor de anotação continua correto**

Run: `npm run dev`, abrir o editor, adicionar uma anotação de texto e percorrer o seletor de fontes. Cada opção deve renderizar no seu próprio tipo, **com a rede desligada**. Nenhuma família pode cair em fonte de sistema.

- [ ] **Step 8: Medir o ganho**

Run: `npx vite build && npm run bench:runtime`
Expected: `startup.hudFirstFrame` menor que o baseline. Registrar o novo valor.

- [ ] **Step 9: Commit**

```bash
git add src/styles/fonts public/fonts src/index.css
git commit -m "perf: self-host annotation fonts and drop the network fetch at boot"
```

---

### Task 13: Política de throttling de janelas

**Files:**
- Create: `electron/throttlePolicy.ts`
- Test: `electron/throttlePolicy.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type WindowKind = "hud" | "editor" | "sourceSelector" | "countdown" | "notes"`
  - `interface AppActivity { recording: boolean; countdownVisible: boolean }`
  - `function shouldDisableThrottling(kind: WindowKind, activity: AppActivity): boolean`

Hoje 4 das 5 janelas nascem com `backgroundThrottling: false` fixo, ou seja, nenhuma delas dorme nunca. Só o HUD e o editor precisam disso, e só durante gravação; o countdown precisa enquanto está visível.

- [ ] **Step 1: Escrever o teste que falha**

Criar `electron/throttlePolicy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type AppActivity, shouldDisableThrottling } from "./throttlePolicy";

const idle: AppActivity = { recording: false, countdownVisible: false };
const recording: AppActivity = { recording: true, countdownVisible: false };
const counting: AppActivity = { recording: false, countdownVisible: true };

describe("shouldDisableThrottling", () => {
	it("lets the HUD sleep while idle", () => {
		expect(shouldDisableThrottling("hud", idle)).toBe(false);
	});

	it("keeps the HUD awake while recording, because the timer must keep ticking", () => {
		expect(shouldDisableThrottling("hud", recording)).toBe(true);
	});

	it("keeps the editor awake while recording so the incoming stream isn't dropped", () => {
		expect(shouldDisableThrottling("editor", recording)).toBe(true);
	});

	it("lets the editor sleep while idle", () => {
		expect(shouldDisableThrottling("editor", idle)).toBe(false);
	});

	it("keeps the countdown awake only while it is on screen", () => {
		expect(shouldDisableThrottling("countdown", counting)).toBe(true);
		expect(shouldDisableThrottling("countdown", idle)).toBe(false);
	});

	it("always lets the source selector and notes sleep", () => {
		expect(shouldDisableThrottling("sourceSelector", recording)).toBe(false);
		expect(shouldDisableThrottling("notes", recording)).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run electron/throttlePolicy.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `electron/throttlePolicy.ts`:

```ts
export type WindowKind = "hud" | "editor" | "sourceSelector" | "countdown" | "notes";

export interface AppActivity {
	recording: boolean;
	countdownVisible: boolean;
}

/**
 * Chromium throttles background renderers to save CPU. Opting out is a real cost,
 * so only windows that must keep a timer or a stream alive get the exemption, and
 * only while they actually need it.
 */
export function shouldDisableThrottling(kind: WindowKind, activity: AppActivity): boolean {
	switch (kind) {
		case "hud":
		case "editor":
			return activity.recording;
		case "countdown":
			return activity.countdownVisible;
		case "sourceSelector":
		case "notes":
			return false;
	}
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run electron/throttlePolicy.test.ts`
Expected: PASS, 7 asserções em 6 testes.

- [ ] **Step 5: Commit**

```bash
git add electron/throttlePolicy.ts electron/throttlePolicy.test.ts
git commit -m "test: define window background throttling policy"
```

---

### Task 14: Aplicar a política de throttling às janelas

**Files:**
- Modify: `electron/windows.ts:119-125,187-194,253-258,305-311,346-352`
- Modify: `electron/main.ts` (aplicar a política nas transições de gravação)
- Test: `electron/windows.test.ts` (criar)

**Interfaces:**
- Consumes: `shouldDisableThrottling`, `WindowKind`, `AppActivity` (Task 13).
- Produces: `function applyThrottlePolicy(activity: AppActivity): void` exportada de `electron/windows.ts`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `electron/windows.test.ts`. Verifica o contrato estático do arquivo, sem subir o Electron:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const WINDOWS_TS = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"windows.ts",
);

describe("window creation", () => {
	const source = fs.readFileSync(WINDOWS_TS, "utf8");

	it("never hardcodes backgroundThrottling, so the policy is the only authority", () => {
		expect(source).not.toContain("backgroundThrottling: false");
		expect(source).not.toContain("backgroundThrottling: true");
	});

	it("exposes a single entry point for applying the policy", () => {
		expect(source).toContain("export function applyThrottlePolicy");
	});

	it("creates every window with context isolation and no node integration", () => {
		const isolation = source.match(/contextIsolation: true/g) ?? [];
		const nodeIntegration = source.match(/nodeIntegration: false/g) ?? [];
		const windows = source.match(/new BrowserWindow\(/g) ?? [];

		expect(isolation).toHaveLength(windows.length);
		expect(nodeIntegration).toHaveLength(windows.length);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run electron/windows.test.ts`
Expected: FAIL nos dois primeiros testes.

- [ ] **Step 3: Registrar as janelas criadas**

No topo de `electron/windows.ts`, depois dos `import`s existentes, acrescentar:

```ts
import {
	type AppActivity,
	shouldDisableThrottling,
	type WindowKind,
} from "./throttlePolicy";

const trackedWindows = new Map<WindowKind, BrowserWindow>();

function track(kind: WindowKind, win: BrowserWindow): BrowserWindow {
	trackedWindows.set(kind, win);
	win.on("closed", () => trackedWindows.delete(kind));

	return win;
}

/**
 * Chromium only reads `backgroundThrottling` at creation time, so the policy is
 * applied live through the WebContents setter instead.
 */
export function applyThrottlePolicy(activity: AppActivity): void {
	for (const [kind, win] of trackedWindows) {
		if (win.isDestroyed()) continue;

		win.webContents.setBackgroundThrottling(!shouldDisableThrottling(kind, activity));
	}
}
```

- [ ] **Step 4: Remover os `backgroundThrottling` fixos e registrar cada janela**

Em cada uma das 5 funções `create*Window`, apagar a linha `backgroundThrottling: false` de `webPreferences` e trocar o `return win` por `return track("<kind>", win)`, com o `kind` correspondente: `createHudOverlayWindow` → `"hud"`, `createEditorWindow` → `"editor"`, `createSourceSelectorWindow` → `"sourceSelector"`, `createCountdownOverlayWindow` → `"countdown"`, `createNotesWindow` → `"notes"`.

- [ ] **Step 5: Aplicar a política nas transições de gravação**

Em `electron/main.ts`, importar `applyThrottlePolicy` de `./windows` e chamá-la nos pontos onde a gravação começa e termina e onde o countdown aparece e some, passando o estado corrente:

```ts
applyThrottlePolicy({ recording: true, countdownVisible: false });
```

Localizar esses pontos por `grep -n "startRecording\|stopRecording\|countdown" electron/main.ts electron/ipc/handlers.ts` e inserir a chamada em cada transição, de modo que ocioso volte a `{ recording: false, countdownVisible: false }`.

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest --run electron/windows.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Verificar manualmente que a gravação não regrediu**

Run: `npm run dev`. Gravar 30 segundos com o HUD em segundo plano, parar, e confirmar que o timer contou certo e o vídeo tem a duração esperada. Este é o risco real da tarefa: se o HUD dormir durante a gravação, o timer atrasa.

- [ ] **Step 8: Medir**

Run: `npx vite build && npm run bench:runtime`
Expected: `memory.idle.total` igual ou menor. Registrar.

- [ ] **Step 9: Avaliar `sandbox: true` e registrar a conclusão**

O `preload.ts` tem 11857 bytes e o `electron-env.d.ts` sugere uma superfície de IPC grande. `sandbox: true` desliga o `require` de módulos Node dentro do preload, então só é viável se o preload não importar nada de `node:`.

Run: `grep -n "node:\|require(" electron/preload.ts`

Se **não houver** nenhuma importação de módulo Node: acrescentar `sandbox: true` ao `webPreferences` das 5 janelas, rodar `npm run dev`, e verificar que HUD, seletor de fonte, gravação e editor continuam funcionando.

Se **houver**: não forçar. Acrescentar um comentário no topo de `electron/windows.ts` nomeando os módulos que impedem o sandbox, para que a Fase 7 saiba o que precisa sair do preload primeiro. Ligar o sandbox quebrando o IPC violaria a restrição global de não degradar features.

- [ ] **Step 10: Commit**

```bash
git add electron/windows.ts electron/windows.test.ts electron/main.ts
git commit -m "perf: throttle background windows unless recording needs them awake"
```

---

### Task 15: Empacotar `onnxruntime-node` só onde é usado

**Files:**
- Modify: `electron-builder.json5`
- Create: `scripts/bench/package-size.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: regra de `files` que exclui binários de ONNX de plataformas que não os usam.

`onnxruntime-node` ocupa 92 MB em `node_modules` e traz binários pré-compilados para todas as plataformas. Só a plataforma alvo do build precisa dos seus.

- [ ] **Step 1: Inspecionar o que existe**

Run: `ls node_modules/onnxruntime-node/bin/napi-v*/`
Expected: um diretório por plataforma (`darwin/`, `win32/`, `linux/`). Anotar os nomes exatos — a regra do próximo passo depende deles.

- [ ] **Step 2: Escrever o teste que falha**

Criar `scripts/bench/package-size.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("electron-builder config", () => {
	const config = fs.readFileSync(path.join(ROOT, "electron-builder.json5"), "utf8");

	it("excludes onnxruntime binaries for platforms other than the build target", () => {
		expect(config).toContain("onnxruntime-node/bin");
	});

	it("keeps the binaries for the platform being built", () => {
		expect(config).toMatch(/\$\{platform\}|darwin|win32|linux/);
	});
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npx vitest --run scripts/bench/package-size.test.ts`
Expected: FAIL no primeiro teste.

- [ ] **Step 4: Adicionar as exclusões por plataforma**

Em `electron-builder.json5`, dentro dos blocos `mac`, `win` e `linux`, acrescentar uma chave `files` que exclui os diretórios das outras plataformas. Usando os nomes confirmados no passo 1 — por exemplo, no bloco `mac`:

```json5
    "files": [
      "!**/node_modules/onnxruntime-node/bin/napi-v*/win32/**",
      "!**/node_modules/onnxruntime-node/bin/napi-v*/linux/**",
    ],
```

Replicar invertido nos blocos `win` e `linux`.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest --run scripts/bench/package-size.test.ts`
Expected: PASS.

- [ ] **Step 6: Verificar que as legendas continuam funcionando**

Run: `npm run build:linux` (ou o alvo da máquina em uso). Instalar o artefato, abrir o editor, gerar legendas automáticas de um clipe com voz, **offline**. As legendas precisam sair. Se falharem, a exclusão pegou o binário errado — corrigir antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add electron-builder.json5 scripts/bench/package-size.test.ts
git commit -m "build: ship onnxruntime binaries only for the target platform"
```

---

### Task 16: Endurecer o processo principal

**Files:**
- Modify: `electron/main.ts`
- Modify: `package.json` (dependência `@electron/fuses`)
- Create: `electron/fuses.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: hook `afterPack` do electron-builder aplicando as Electron Fuses.

- [ ] **Step 1: Escrever o teste que falha**

Criar `electron/fuses.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("main process hardening", () => {
	it("registers an afterPack hook that flips the Electron fuses", () => {
		const config = fs.readFileSync(path.join(ROOT, "electron-builder.json5"), "utf8");

		expect(config).toContain("afterPack");
	});

	it("ships the fuses hook", () => {
		expect(fs.existsSync(path.join(ROOT, "scripts/afterPack.mjs"))).toBe(true);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run electron/fuses.test.ts`
Expected: FAIL nos dois.

- [ ] **Step 3: Instalar a ferramenta**

Run: `npm install --save-dev @electron/fuses`

- [ ] **Step 4: Escrever o hook**

Criar `scripts/afterPack.mjs`:

```js
import path from "node:path";
import { FuseV1Options, FuseVersion, flipFuses } from "@electron/fuses";

/**
 * Turns off Electron features the app never uses. RunAsNode and the Node CLI
 * inspect arguments are the two that let a packaged app be repurposed as a
 * generic Node runtime; the cookie encryption and ASAR integrity fuses harden
 * what the app ships.
 */
export default async function afterPack(context) {
	const { appOutDir, packager, electronPlatformName } = context;
	const executable = path.join(
		appOutDir,
		electronPlatformName === "darwin"
			? `${packager.appInfo.productFilename}.app`
			// electron-builder lowercases productName for the Linux binary name
			// (executableName), unlike macOS/Windows which keep productFilename's
			// casing — using productFilename here would point at a path that never exists.
			: `${packager.executableName}${electronPlatformName === "win32" ? ".exe" : ""}`,
	);

	await flipFuses(executable, {
		version: FuseVersion.V1,
		resetAdHocDarwinSignature: electronPlatformName === "darwin",
		[FuseV1Options.RunAsNode]: false,
		[FuseV1Options.EnableCookieEncryption]: true,
		[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
		[FuseV1Options.EnableNodeCliInspectArguments]: false,
		[FuseV1Options.OnlyLoadAppFromAsar]: true,
	});
}
```

- [ ] **Step 5: Registrar o hook**

Em `electron-builder.json5`, no nível raiz:

```json5
  "afterPack": "./scripts/afterPack.mjs",
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx vitest --run electron/fuses.test.ts`
Expected: PASS.

- [ ] **Step 7: Verificar que o app empacotado sobe**

Run: `npm run build:linux` (ou o alvo local), instalar e abrir. O HUD precisa aparecer e uma gravação curta precisa completar. `OnlyLoadAppFromAsar` quebra o app se algum caminho carregar código de fora do asar — se isso acontecer, desligar **apenas** essa fuse, manter as outras, e anotar o motivo em comentário.

- [ ] **Step 8: Medir**

Run: `npx vite build && npm run bench:runtime`
Expected: `startup.hudFirstFrame` igual ou menor.

- [ ] **Step 9: Commit**

```bash
git add scripts/afterPack.mjs electron/fuses.test.ts electron-builder.json5 package.json package-lock.json
git commit -m "build: harden packaged app with electron fuses"
```

---

### Task 17: Reapertar os orçamentos após a poda

**Files:**
- Modify: `perf-budgets.json`

- [ ] **Step 1: Medir tudo de novo**

Run:
```bash
npx vite build
npm run bench:bundle
npm run bench:runtime
```

- [ ] **Step 2: Baixar cada `max` para o valor novo + 5%**

Editar `perf-budgets.json` reduzindo todo `max` cujo valor medido caiu. Um orçamento que continua no número velho depois de uma melhoria é espaço livre para a regressão voltar.

- [ ] **Step 3: Confirmar**

Run: `npm run bench:ci`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add perf-budgets.json
git commit -m "ci: tighten budgets to the post-pruning numbers"
```

---

# FASE 2 — Camada de design

Nenhuma tela existente muda nesta fase. A entrega é a base sobre a qual as Fases 3–6 constroem.

---

### Task 18: Tokens de cor

**Files:**
- Create: `src/design/tokens/color.ts`
- Test: `src/design/tokens/color.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `const color` com as chaves `surfaceBase`, `surfaceRaised`, `brandPrimary`, `brandPrimaryHover`, `specular`, `textPrimary`, `textSecondary`, `textTertiary`, `semanticRecording`, `semanticSuccess`, `semanticWarning`.

Valores exatos de `DESIGN.md` §3.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/tokens/color.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { color } from "./color";

describe("color tokens", () => {
	it("matches DESIGN.md section 3 exactly", () => {
		expect(color).toEqual({
			surfaceBase: "#0A0A0C",
			surfaceRaised: "#141416",
			brandPrimary: "#5E5CE6",
			brandPrimaryHover: "#8886F0",
			specular: "#FFFFFF",
			textPrimary: "#F5F5F7",
			textSecondary: "rgba(245,245,247,0.62)",
			textTertiary: "rgba(245,245,247,0.34)",
			semanticRecording: "#FF453A",
			semanticSuccess: "#32D74B",
			semanticWarning: "#FF9F0A",
		});
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/tokens/color.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/tokens/color.ts`:

```ts
/** Values are copied verbatim from DESIGN.md section 3. Do not approximate. */
export const color = {
	surfaceBase: "#0A0A0C",
	surfaceRaised: "#141416",
	brandPrimary: "#5E5CE6",
	brandPrimaryHover: "#8886F0",
	specular: "#FFFFFF",
	textPrimary: "#F5F5F7",
	textSecondary: "rgba(245,245,247,0.62)",
	textTertiary: "rgba(245,245,247,0.34)",
	semanticRecording: "#FF453A",
	semanticSuccess: "#32D74B",
	semanticWarning: "#FF9F0A",
} as const;

export type ColorToken = keyof typeof color;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/tokens/color.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens/color.ts src/design/tokens/color.test.ts
git commit -m "feat: add color tokens from the design system"
```

---

### Task 19: Tokens de espaçamento, raio e elevação

**Files:**
- Create: `src/design/tokens/space.ts`
- Test: `src/design/tokens/space.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `const space` (`1`–`8` → px de §6)
  - `const radius` (`sm`, `md`, `lg`, `xl` de §5)
  - `const elevation` (níveis `1`–`3` com `backdropBlurPx` e `shadowBlurPx` de §5)
  - `function isValidSpacing(px: number): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/tokens/space.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { elevation, isValidSpacing, radius, space } from "./space";

describe("space tokens", () => {
	it("is the base-4 scale from DESIGN.md section 6", () => {
		expect(space).toEqual({ 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 });
	});
});

describe("radius tokens", () => {
	it("is the fixed four-step scale from DESIGN.md section 5", () => {
		expect(radius).toEqual({ sm: 8, md: 14, lg: 20, xl: 28 });
	});
});

describe("elevation tokens", () => {
	it("raises backdrop blur and shadow blur together, never one alone", () => {
		expect(elevation).toEqual({
			1: { backdropBlurPx: 12, shadowBlurPx: 8 },
			2: { backdropBlurPx: 24, shadowBlurPx: 32 },
			3: { backdropBlurPx: 40, shadowBlurPx: 48 },
		});
	});
});

describe("isValidSpacing", () => {
	it("accepts values on the scale", () => {
		expect(isValidSpacing(16)).toBe(true);
		expect(isValidSpacing(64)).toBe(true);
	});

	it("rejects values off the scale, including the tempting ones", () => {
		expect(isValidSpacing(13)).toBe(false);
		expect(isValidSpacing(17)).toBe(false);
		expect(isValidSpacing(20)).toBe(false);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/tokens/space.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/tokens/space.ts`:

```ts
/** Base-4 spacing scale from DESIGN.md section 6. No intermediate values exist. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

/** Corner radii from DESIGN.md section 5. */
export const radius = { sm: 8, md: 14, lg: 20, xl: 28 } as const;

/**
 * Depth levels from DESIGN.md section 5. Each level raises backdrop blur and
 * shadow blur together — one without the other reads as a flat overlay.
 */
export const elevation = {
	1: { backdropBlurPx: 12, shadowBlurPx: 8 },
	2: { backdropBlurPx: 24, shadowBlurPx: 32 },
	3: { backdropBlurPx: 40, shadowBlurPx: 48 },
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type ElevationLevel = keyof typeof elevation;

const SPACING_VALUES = new Set<number>(Object.values(space));

export function isValidSpacing(px: number): boolean {
	return SPACING_VALUES.has(px);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/tokens/space.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens/space.ts src/design/tokens/space.test.ts
git commit -m "feat: add spacing, radius and elevation tokens"
```

---

### Task 20: Tokens de tipografia

**Files:**
- Create: `src/design/tokens/typography.ts`
- Test: `src/design/tokens/typography.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `interface TypeStep { sizePx: number; lineHeight: number; weight: number; tabularNums?: boolean }`
  - `const typography: Record<"display" | "title1" | "title2" | "body" | "bodyEmphasis" | "caption" | "captionNumeric", TypeStep>`
  - `const fontStack: { display: string; text: string; mono: string }`

A escala é a de §4. A stack **não** usa `-apple-system`: por decisão da spec, a fonte de UI é embarcada (Task 21).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/tokens/typography.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fontStack, typography } from "./typography";

describe("typography scale", () => {
	it("is the seven steps from DESIGN.md section 4", () => {
		expect(typography).toEqual({
			display: { sizePx: 34, lineHeight: 1.1, weight: 700 },
			title1: { sizePx: 22, lineHeight: 1.2, weight: 600 },
			title2: { sizePx: 17, lineHeight: 1.3, weight: 600 },
			body: { sizePx: 13, lineHeight: 1.4, weight: 400 },
			bodyEmphasis: { sizePx: 13, lineHeight: 1.4, weight: 590 },
			caption: { sizePx: 11, lineHeight: 1.3, weight: 400 },
			captionNumeric: { sizePx: 11, lineHeight: 1.3, weight: 500, tabularNums: true },
		});
	});

	it("never goes above weight 700, the most common tell of a fake Apple UI", () => {
		for (const step of Object.values(typography)) {
			expect(step.weight).toBeLessThanOrEqual(700);
		}
	});
});

describe("font stack", () => {
	it("leads with the embedded family, not a system font", () => {
		expect(fontStack.display.startsWith('"Iris Sans"')).toBe(true);
		expect(fontStack.text.startsWith('"Iris Sans"')).toBe(true);
		expect(fontStack.mono.startsWith('"Iris Mono"')).toBe(true);
	});

	it("ships no Apple-licensed family name", () => {
		const stacks = Object.values(fontStack).join(" ");

		expect(stacks).not.toContain("SF Pro");
		expect(stacks).not.toContain("SF Mono");
		expect(stacks).not.toContain("-apple-system");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/tokens/typography.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/tokens/typography.ts`:

```ts
export interface TypeStep {
	sizePx: number;
	lineHeight: number;
	weight: number;
	tabularNums?: boolean;
}

/** The seven steps from DESIGN.md section 4. No intermediate sizes exist. */
export const typography = {
	display: { sizePx: 34, lineHeight: 1.1, weight: 700 },
	title1: { sizePx: 22, lineHeight: 1.2, weight: 600 },
	title2: { sizePx: 17, lineHeight: 1.3, weight: 600 },
	body: { sizePx: 13, lineHeight: 1.4, weight: 400 },
	bodyEmphasis: { sizePx: 13, lineHeight: 1.4, weight: 590 },
	caption: { sizePx: 11, lineHeight: 1.3, weight: 400 },
	captionNumeric: { sizePx: 11, lineHeight: 1.3, weight: 500, tabularNums: true },
} as const satisfies Record<string, TypeStep>;

export type TypeToken = keyof typeof typography;

/**
 * The UI family is embedded, not borrowed from the OS: the app runs on macOS,
 * Windows and Linux and must render identically on all three. "Iris Sans" and
 * "Iris Mono" are the local aliases declared in src/design/fonts.css.
 */
export const fontStack = {
	display: '"Iris Sans", system-ui, sans-serif',
	text: '"Iris Sans", system-ui, sans-serif',
	mono: '"Iris Mono", ui-monospace, monospace',
} as const;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/tokens/typography.test.ts`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens/typography.ts src/design/tokens/typography.test.ts
git commit -m "feat: add typography tokens with an embedded font stack"
```

---

### Task 21: Embarcar a fonte de UI

**Files:**
- Create: `public/fonts/iris-sans-variable.woff2`
- Create: `public/fonts/iris-mono-variable.woff2`
- Create: `src/design/fonts.css`
- Test: `src/design/fonts.test.ts`

**Interfaces:**
- Consumes: `fontStack` (Task 20).
- Produces: famílias `Iris Sans` e `Iris Mono` declaradas localmente.

`Iris Sans` é Inter Variable (SIL OFL 1.1); `Iris Mono` é JetBrains Mono Variable (SIL OFL 1.1). Ambas são renomeadas via `font-family` do `@font-face` para desacoplar o código da escolha da fonte — trocar a fonte depois vira uma troca de arquivo, não uma varredura no código.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/fonts.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("UI fonts", () => {
	const css = () => fs.readFileSync(path.join(ROOT, "src/design/fonts.css"), "utf8");

	it("declares both embedded families", () => {
		expect(css()).toContain('font-family: "Iris Sans"');
		expect(css()).toContain('font-family: "Iris Mono"');
	});

	it("ships the variable font files", () => {
		expect(fs.existsSync(path.join(ROOT, "public/fonts/iris-sans-variable.woff2"))).toBe(true);
		expect(fs.existsSync(path.join(ROOT, "public/fonts/iris-mono-variable.woff2"))).toBe(true);
	});

	it("covers the full weight range the scale needs, 400 through 700", () => {
		expect(css()).toContain("font-weight: 400 700");
	});

	it("loads nothing over the network", () => {
		expect(css()).not.toContain("http");
	});

	it("records the licence of every embedded family", () => {
		const licences = fs.readFileSync(path.join(ROOT, "public/fonts/LICENSES.md"), "utf8");

		expect(licences).toContain("Iris Sans");
		expect(licences).toContain("Iris Mono");
		expect(licences).toContain("SIL Open Font License");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/fonts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Baixar e instalar as fontes**

Baixar Inter Variable e JetBrains Mono Variable em `.woff2`, salvar como `public/fonts/iris-sans-variable.woff2` e `public/fonts/iris-mono-variable.woff2`. Acrescentar as duas ao `public/fonts/LICENSES.md` criado na Task 12, cada uma com nome de origem, licença (SIL Open Font License 1.1) e URL.

- [ ] **Step 4: Escrever o CSS**

Criar `src/design/fonts.css`:

```css
/*
 * The UI families are embedded so the interface renders identically on macOS,
 * Windows and Linux. They are aliased to product names so swapping the
 * underlying face later is a file change, not a codebase-wide rename.
 */
@font-face {
	font-family: "Iris Sans";
	font-style: normal;
	font-weight: 400 700;
	font-display: block;
	src: url("/fonts/iris-sans-variable.woff2") format("woff2-variations");
}

@font-face {
	font-family: "Iris Mono";
	font-style: normal;
	font-weight: 400 700;
	font-display: block;
	src: url("/fonts/iris-mono-variable.woff2") format("woff2-variations");
}
```

`font-display: block` em vez de `swap`: a fonte é local e carrega em milissegundos, e um flash de fonte de sistema na abertura do HUD é exatamente o tipo de detalhe que quebra a percepção de acabamento.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/fonts.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 6: Commit**

```bash
git add src/design/fonts.css src/design/fonts.test.ts public/fonts
git commit -m "feat: embed the UI font families"
```

---

### Task 22: Tokens de motion

**Files:**
- Create: `src/design/tokens/motion.ts`
- Test: `src/design/tokens/motion.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `const easing: { standard: string; spring: string }`
  - `const duration: { fast: number; standard: number; slow: number }`
  - `function isWithinResponseBudget(ms: number): boolean`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/tokens/motion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { duration, easing, isWithinResponseBudget } from "./motion";

describe("easing tokens", () => {
	it("is exactly the two curves from DESIGN.md section 8, never a third", () => {
		expect(easing).toEqual({
			standard: "cubic-bezier(0.32, 0.72, 0, 1)",
			spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
		});
	});
});

describe("duration tokens", () => {
	it("is the three fixed durations from DESIGN.md section 8", () => {
		expect(duration).toEqual({ fast: 150, standard: 280, slow: 420 });
	});
});

describe("isWithinResponseBudget", () => {
	it("accepts anything up to the 400ms Doherty threshold", () => {
		expect(isWithinResponseBudget(150)).toBe(true);
		expect(isWithinResponseBudget(400)).toBe(true);
	});

	it("rejects anything past it", () => {
		expect(isWithinResponseBudget(401)).toBe(false);
		expect(isWithinResponseBudget(1000)).toBe(false);
	});

	it("accepts the documented slow exception, the HUD entering and leaving", () => {
		expect(isWithinResponseBudget(duration.slow)).toBe(false);
	});
});
```

O último teste documenta deliberadamente que `duration.slow` (420ms) **estoura** o orçamento de resposta — é a exceção documentada em §8 e em `UX-PRINCIPLES.md` Parte 4, reservada ao HUD entrando e saindo de tela.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/tokens/motion.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/tokens/motion.ts`:

```ts
/** The two curves from DESIGN.md section 8. A third curve is a design bug. */
export const easing = {
	standard: "cubic-bezier(0.32, 0.72, 0, 1)",
	spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Fixed durations from DESIGN.md section 8, in milliseconds. */
export const duration = { fast: 150, standard: 280, slow: 420 } as const;

/**
 * Doherty threshold (UX-PRINCIPLES.md part 4): past 400ms the user starts to
 * disengage. `duration.slow` intentionally exceeds it — the HUD entering and
 * leaving the screen is the one documented exception.
 */
const RESPONSE_BUDGET_MS = 400;

export function isWithinResponseBudget(ms: number): boolean {
	return ms <= RESPONSE_BUDGET_MS;
}

export type EasingToken = keyof typeof easing;
export type DurationToken = keyof typeof duration;
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/tokens/motion.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/design/tokens/motion.ts src/design/tokens/motion.test.ts
git commit -m "feat: add motion tokens with the documented response budget"
```

---

### Task 23: Serializar os tokens em CSS

**Files:**
- Create: `src/design/tokens/index.ts`
- Create: `src/design/tokens/toCss.ts`
- Test: `src/design/tokens/toCss.test.ts`
- Create: `scripts/generate-design-css.ts`
- Modify: `package.json` (script `design:css`)

**Interfaces:**
- Consumes: `color`, `space`/`radius`/`elevation`, `typography`/`fontStack`, `easing`/`duration`.
- Produces:
  - `const tokens` (objeto agregado)
  - `function tokensToCss(): string`
  - arquivo gerado `src/design/tokens.generated.css`

Os nomes das custom properties são os de `DESIGN.md` (`--surface-base`, `--brand-primary`, `--radius-md`, `--space-4`, `--ease-standard`, `--duration-fast`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/tokens/toCss.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tokensToCss } from "./toCss";

describe("tokensToCss", () => {
	const css = tokensToCss();

	it("wraps everything in a :root block", () => {
		expect(css.startsWith(":root {")).toBe(true);
		expect(css.trimEnd().endsWith("}")).toBe(true);
	});

	it("uses the custom property names DESIGN.md specifies", () => {
		expect(css).toContain("--surface-base: #0A0A0C;");
		expect(css).toContain("--brand-primary: #5E5CE6;");
		expect(css).toContain("--semantic-recording: #FF453A;");
	});

	it("emits the spacing scale with px units", () => {
		expect(css).toContain("--space-1: 4px;");
		expect(css).toContain("--space-8: 64px;");
	});

	it("emits the radius scale with px units", () => {
		expect(css).toContain("--radius-sm: 8px;");
		expect(css).toContain("--radius-xl: 28px;");
	});

	it("emits both easing curves and all three durations", () => {
		expect(css).toContain("--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);");
		expect(css).toContain("--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);");
		expect(css).toContain("--duration-fast: 150ms;");
		expect(css).toContain("--duration-slow: 420ms;");
	});

	it("emits the font stacks", () => {
		expect(css).toContain("--font-text:");
		expect(css).toContain("--font-mono:");
	});

	it("emits elevation blur pairs so no surface can raise one without the other", () => {
		expect(css).toContain("--elevation-2-glass-blur: 24px;");
		expect(css).toContain("--elevation-2-shadow-blur: 32px;");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/tokens/toCss.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar o agregador**

Criar `src/design/tokens/index.ts`:

```ts
export { color, type ColorToken } from "./color";
export { duration, easing, isWithinResponseBudget } from "./motion";
export { elevation, isValidSpacing, radius, space } from "./space";
export { fontStack, typography, type TypeStep, type TypeToken } from "./typography";
```

- [ ] **Step 4: Implementar o serializador**

Criar `src/design/tokens/toCss.ts`:

```ts
import { color } from "./color";
import { duration, easing } from "./motion";
import { elevation, radius, space } from "./space";
import { fontStack } from "./typography";

/** camelCase token key to the kebab-case custom property name in DESIGN.md. */
function kebab(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const COLOR_PROPERTY: Record<keyof typeof color, string> = {
	surfaceBase: "--surface-base",
	surfaceRaised: "--surface-raised",
	brandPrimary: "--brand-primary",
	brandPrimaryHover: "--brand-primary-hover",
	specular: "--specular",
	textPrimary: "--text-primary",
	textSecondary: "--text-secondary",
	textTertiary: "--text-tertiary",
	semanticRecording: "--semantic-recording",
	semanticSuccess: "--semantic-success",
	semanticWarning: "--semantic-warning",
};

export function tokensToCss(): string {
	const lines: string[] = [];

	for (const [token, value] of Object.entries(color)) {
		lines.push(`\t${COLOR_PROPERTY[token as keyof typeof color]}: ${value};`);
	}

	for (const [step, px] of Object.entries(space)) {
		lines.push(`\t--space-${step}: ${px}px;`);
	}

	for (const [step, px] of Object.entries(radius)) {
		lines.push(`\t--radius-${step}: ${px}px;`);
	}

	for (const [level, blur] of Object.entries(elevation)) {
		lines.push(`\t--elevation-${level}-glass-blur: ${blur.backdropBlurPx}px;`);
		lines.push(`\t--elevation-${level}-shadow-blur: ${blur.shadowBlurPx}px;`);
	}

	for (const [name, value] of Object.entries(fontStack)) {
		lines.push(`\t--font-${kebab(name)}: ${value};`);
	}

	for (const [name, value] of Object.entries(easing)) {
		lines.push(`\t--ease-${kebab(name)}: ${value};`);
	}

	for (const [name, ms] of Object.entries(duration)) {
		lines.push(`\t--duration-${kebab(name)}: ${ms}ms;`);
	}

	return `:root {\n${lines.join("\n")}\n}\n`;
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/tokens/toCss.test.ts`
Expected: PASS, 7 testes.

- [ ] **Step 6: Escrever o gerador**

Criar `scripts/generate-design-css.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokensToCss } from "../src/design/tokens/toCss.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "src/design/tokens.generated.css");

fs.writeFileSync(
	OUTPUT,
	`/* Generated by scripts/generate-design-css.ts. Do not edit by hand. */\n${tokensToCss()}`,
	"utf8",
);

console.info(`Wrote ${OUTPUT}`);
```

- [ ] **Step 7: Registrar o script e gerar**

Em `package.json`:

```json
		"design:css": "node scripts/generate-design-css.ts",
```

Run: `npm run design:css`
Expected: `src/design/tokens.generated.css` criado.

- [ ] **Step 8: Importar no app**

Em `src/index.css`, logo depois do import das fontes de anotação:

```css
@import "./design/fonts.css";
@import "./design/tokens.generated.css";
```

- [ ] **Step 9: Verificar que nada visual quebrou**

Run: `npm run dev`
Expected: o app abre igual ao que era. Os tokens estão declarados mas nenhuma tela os consome ainda — é o esperado nesta fase.

O `tailwind.config.cjs` continua com o mapa shadcn atual e **não** é tocado aqui: trocá-lo agora reestilizaria as telas antigas de uma vez, fora do controle das fases de superfície. A ponte Tailwind→tokens entra na Fase 3, junto com a primeira tela que a consome.

- [ ] **Step 10: Commit**

```bash
git add src/design/tokens src/design/tokens.generated.css scripts/generate-design-css.ts src/index.css package.json
git commit -m "feat: generate design token CSS from the TypeScript source of truth"
```

---

### Task 24: Verificação de contraste

**Files:**
- Create: `src/design/contrast.ts`
- Test: `src/design/contrast.test.ts`

**Interfaces:**
- Consumes: `color` (Task 18).
- Produces:
  - `function parseColor(value: string): { r: number; g: number; b: number; a: number }`
  - `function contrastRatio(foreground: string, background: string): number`

Aceita `#RRGGBB` e `rgba(r,g,b,a)`. Cores com alfa são compostas sobre o fundo antes do cálculo — sem isso, `--text-secondary` (alfa 0.62) daria um número que não corresponde ao que o olho vê.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { color } from "./tokens/color";
import { contrastRatio, parseColor } from "./contrast";

describe("parseColor", () => {
	it("reads six-digit hex", () => {
		expect(parseColor("#5E5CE6")).toEqual({ r: 94, g: 92, b: 230, a: 1 });
	});

	it("reads rgba with alpha", () => {
		expect(parseColor("rgba(245,245,247,0.62)")).toEqual({ r: 245, g: 245, b: 247, a: 0.62 });
	});

	it("rejects anything else instead of guessing", () => {
		expect(() => parseColor("red")).toThrow();
	});
});

describe("contrastRatio", () => {
	it("gives 21 for black on white", () => {
		expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
	});

	it("gives 1 for a colour against itself", () => {
		expect(contrastRatio("#5E5CE6", "#5E5CE6")).toBeCloseTo(1, 5);
	});

	it("composites a translucent foreground over the background first", () => {
		const composited = contrastRatio(color.textSecondary, color.surfaceBase);
		const opaque = contrastRatio("#F5F5F7", color.surfaceBase);

		expect(composited).toBeLessThan(opaque);
	});
});

describe("design system contrast floor", () => {
	it("keeps primary text at or above 4.5:1 on the base surface", () => {
		expect(contrastRatio(color.textPrimary, color.surfaceBase)).toBeGreaterThanOrEqual(4.5);
	});

	it("keeps secondary text at or above 4.5:1 on the base surface", () => {
		expect(contrastRatio(color.textSecondary, color.surfaceBase)).toBeGreaterThanOrEqual(4.5);
	});

	it("keeps primary text at or above 4.5:1 on the raised surface", () => {
		expect(contrastRatio(color.textPrimary, color.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/contrast.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/contrast.ts`:

```ts
export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX = /^#([0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export function parseColor(value: string): Rgba {
	const hex = HEX.exec(value.trim());

	if (hex) {
		const int = Number.parseInt(hex[1], 16);

		return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 1 };
	}

	const rgba = RGBA.exec(value.trim());

	if (rgba) {
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
			a: rgba[4] === undefined ? 1 : Number(rgba[4]),
		};
	}

	throw new Error(`Unsupported colour format: ${value}`);
}

function composite(foreground: Rgba, background: Rgba): Rgba {
	return {
		r: foreground.r * foreground.a + background.r * (1 - foreground.a),
		g: foreground.g * foreground.a + background.g * (1 - foreground.a),
		b: foreground.b * foreground.a + background.b * (1 - foreground.a),
		a: 1,
	};
}

function channelLuminance(channel: number): number {
	const normalized = channel / 255;

	return normalized <= 0.03928
		? normalized / 12.92
		: ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgba): number {
	return (
		0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
	);
}

/** WCAG 2.1 contrast ratio. Translucent foregrounds are composited first. */
export function contrastRatio(foreground: string, background: string): number {
	const back = parseColor(background);
	const front = composite(parseColor(foreground), back);

	const lighter = Math.max(relativeLuminance(front), relativeLuminance(back));
	const darker = Math.min(relativeLuminance(front), relativeLuminance(back));

	return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/contrast.test.ts`
Expected: PASS, 9 testes.

Se algum teste do bloco "design system contrast floor" falhar, **não relaxar o teste**: significa que um token de `DESIGN.md` não atinge o piso que o próprio documento exige (§11). Reportar o conflito antes de prosseguir.

- [ ] **Step 5: Commit**

```bash
git add src/design/contrast.ts src/design/contrast.test.ts
git commit -m "test: enforce the 4.5:1 contrast floor on design tokens"
```

---

### Task 25: Primitiva de vidro

**Files:**
- Create: `src/design/glass/Glass.tsx`
- Test: `src/design/glass/Glass.test.tsx`

**Interfaces:**
- Consumes: `elevation`, `radius` (Task 19).
- Produces:
  - `interface GlassProps { level: 1 | 2 | 3; radius?: "sm" | "md" | "lg" | "xl"; className?: string; children?: React.ReactNode }`
  - `function Glass(props: GlassProps): JSX.Element`
  - `const GLASS_MARKER = "data-iris-glass"`

Um único componente detém as 3 camadas de `DESIGN.md` §5. Nenhuma tela aplica `backdrop-filter` por conta própria — a Task 28 transforma isso em regra que quebra o build. O marcador `data-iris-glass` permite detectar vidro aninhado.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/glass/Glass.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Glass } from "./Glass";

describe("Glass", () => {
	it("applies backdrop blur and the mandatory 180% saturation", () => {
		render(<Glass level={2}>content</Glass>);
		const element = screen.getByText("content");

		expect(element.style.backdropFilter).toBe("blur(24px) saturate(180%)");
		expect(element.style.webkitBackdropFilter).toBe("blur(24px) saturate(180%)");
	});

	it("scales backdrop blur with the elevation level", () => {
		const { rerender } = render(<Glass level={1}>content</Glass>);
		expect(screen.getByText("content").style.backdropFilter).toContain("blur(12px)");

		rerender(<Glass level={3}>content</Glass>);
		expect(screen.getByText("content").style.backdropFilter).toContain("blur(40px)");
	});

	it("tints the surface within the 0.06 to 0.12 band, never outside it", () => {
		render(<Glass level={2}>content</Glass>);

		expect(screen.getByText("content").style.background).toBe("rgba(255, 255, 255, 0.08)");
	});

	it("makes the top border lighter than the others, so the material reads as thick", () => {
		render(<Glass level={2}>content</Glass>);
		const element = screen.getByText("content");

		expect(element.style.border).toBe("0.5px solid rgba(255, 255, 255, 0.14)");
		expect(element.style.borderTop).toBe("0.5px solid rgba(255, 255, 255, 0.24)");
	});

	it("raises shadow blur together with backdrop blur", () => {
		render(<Glass level={3}>content</Glass>);

		expect(screen.getByText("content").style.boxShadow).toContain("48px");
	});

	it("defaults to the large radius and honours an override", () => {
		const { rerender } = render(<Glass level={2}>content</Glass>);
		expect(screen.getByText("content").style.borderRadius).toBe("20px");

		rerender(
			<Glass level={2} radius="xl">
				content
			</Glass>,
		);
		expect(screen.getByText("content").style.borderRadius).toBe("28px");
	});

	it("marks itself so nested glass can be detected", () => {
		render(<Glass level={2}>content</Glass>);

		expect(screen.getByText("content")).toHaveAttribute("data-iris-glass", "2");
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/glass/Glass.test.tsx`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/glass/Glass.tsx`:

```tsx
import type { CSSProperties, ReactNode } from "react";
import { type ElevationLevel, elevation, type RadiusToken, radius } from "../tokens/space";

export const GLASS_MARKER = "data-iris-glass";

export interface GlassProps {
	level: ElevationLevel;
	radius?: RadiusToken;
	className?: string;
	children?: ReactNode;
}

/**
 * The only place in the app allowed to build the glass material. It stacks the
 * three layers DESIGN.md section 5 requires — backdrop blur, surface tint and
 * specular border — because any one of them alone reads as flat translucency.
 */
export function Glass({ level, radius: radiusToken = "lg", className, children }: GlassProps) {
	const { backdropBlurPx, shadowBlurPx } = elevation[level];
	const backdrop = `blur(${backdropBlurPx}px) saturate(180%)`;

	const style: CSSProperties = {
		backdropFilter: backdrop,
		WebkitBackdropFilter: backdrop,
		background: "rgba(255, 255, 255, 0.08)",
		border: "0.5px solid rgba(255, 255, 255, 0.14)",
		borderTop: "0.5px solid rgba(255, 255, 255, 0.24)",
		borderRadius: `${radius[radiusToken]}px`,
		boxShadow: [
			"0 0 0 0.5px rgba(0, 0, 0, 0.3)",
			`0 12px ${shadowBlurPx}px rgba(0, 0, 0, 0.28)`,
			"inset 0 1px 0 rgba(255, 255, 255, 0.08)",
		].join(", "),
	};

	return (
		<div className={className} style={style} {...{ [GLASS_MARKER]: String(level) }}>
			{children}
		</div>
	);
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/glass/Glass.test.tsx`
Expected: PASS, 7 testes.

Se `element.style.webkitBackdropFilter` vier vazio no jsdom, trocar a asserção por `expect(element.getAttribute("style")).toContain("-webkit-backdrop-filter")`.

- [ ] **Step 5: Commit**

```bash
git add src/design/glass/Glass.tsx src/design/glass/Glass.test.tsx
git commit -m "feat: add the glass surface primitive"
```

---

### Task 26: Helpers de motion em WAAPI

**Files:**
- Create: `src/design/motion/animate.ts`
- Test: `src/design/motion/animate.test.ts`

**Interfaces:**
- Consumes: `easing`, `duration` (Task 22).
- Produces:
  - `function prefersReducedMotion(): boolean`
  - `interface RevealOptions { durationMs: number; easing: string }`
  - `function reveal(element: Element, options?: Partial<RevealOptions>): Animation`

`reveal` é o fade + micro-scale 0.98→1 que §8 define como o motion utilitário padrão. Anima só `opacity` e `transform`, que o compositor resolve sem layout nem paint.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/motion/animate.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { duration, easing } from "../tokens/motion";
import { prefersReducedMotion, reveal } from "./animate";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("prefersReducedMotion", () => {
	it("is true when the system asks for reduced motion", () => {
		mockReducedMotion(true);

		expect(prefersReducedMotion()).toBe(true);
	});

	it("is false otherwise", () => {
		mockReducedMotion(false);

		expect(prefersReducedMotion()).toBe(false);
	});
});

describe("reveal", () => {
	it("animates only opacity and transform, so the compositor can own the frame", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes] = animate.mock.calls[0];
		const properties = new Set(keyframes.flatMap((frame: object) => Object.keys(frame)));

		expect(properties).toEqual(new Set(["opacity", "transform"]));
	});

	it("uses the standard curve and standard duration by default", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [, options] = animate.mock.calls[0];

		expect(options.duration).toBe(duration.standard);
		expect(options.easing).toBe(easing.standard);
	});

	it("starts from a 0.98 scale, never a bounce", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes] = animate.mock.calls[0];

		expect(keyframes[0].transform).toBe("scale(0.98)");
		expect(keyframes[1].transform).toBe("scale(1)");
	});

	it("drops the scale and shortens to the fast duration under reduced motion", () => {
		mockReducedMotion(true);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes, options] = animate.mock.calls[0];

		expect(keyframes.every((frame: { transform?: string }) => frame.transform === undefined)).toBe(
			true,
		);
		expect(options.duration).toBe(duration.fast);
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/motion/animate.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

Criar `src/design/motion/animate.ts`:

```ts
import { duration, easing } from "../tokens/motion";

export function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

export interface RevealOptions {
	durationMs: number;
	easing: string;
}

/**
 * The default utility motion of DESIGN.md section 8: fade plus a 0.98 to 1
 * micro-scale, never a bounce. Only opacity and transform are touched so the
 * compositor can run it without layout or paint.
 */
export function reveal(element: Element, options: Partial<RevealOptions> = {}): Animation {
	const reduced = prefersReducedMotion();

	const keyframes = reduced
		? [{ opacity: 0 }, { opacity: 1 }]
		: [
				{ opacity: 0, transform: "scale(0.98)" },
				{ opacity: 1, transform: "scale(1)" },
			];

	return element.animate(keyframes, {
		duration: options.durationMs ?? (reduced ? duration.fast : duration.standard),
		easing: options.easing ?? easing.standard,
		fill: "both",
	});
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/motion/animate.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/design/motion/animate.ts src/design/motion/animate.test.ts
git commit -m "feat: add WAAPI motion helpers honouring reduced motion"
```

---

### Task 27: Sistema de ícones próprio

**Files:**
- Create: `src/design/icons/sprite.svg`
- Create: `src/design/icons/Icon.tsx`
- Test: `src/design/icons/Icon.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type IconName = "record" | "stop" | "pause" | "settings" | "microphone" | "camera" | "close" | "minimize" | "check" | "folder" | "chevron-right" | "drag-handle"`
  - `interface IconProps { name: IconName; size?: 16 | 20 | 24; label?: string; className?: string }`
  - `function Icon(props: IconProps): JSX.Element`

Doze símbolos cobrem o HUD e a janela de lançamento (Fases 3 e 4). Regras de autoria: grade de 20×20, stroke de 1.5px, junções arredondadas, mesmo peso óptico entre todos, `currentColor` sempre — a cor vem do contexto, nunca do arquivo.

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/design/icons/Icon.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./Icon";

const SPRITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "sprite.svg");

const NAMES: IconName[] = [
	"record",
	"stop",
	"pause",
	"settings",
	"microphone",
	"camera",
	"close",
	"minimize",
	"check",
	"folder",
	"chevron-right",
	"drag-handle",
];

describe("sprite", () => {
	const svg = fs.readFileSync(SPRITE, "utf8");

	it("defines every declared icon", () => {
		for (const name of NAMES) {
			expect(svg).toContain(`id="icon-${name}"`);
		}
	});

	it("draws every symbol on the same 20x20 grid", () => {
		const viewBoxes = [...svg.matchAll(/<symbol[^>]*viewBox="([^"]+)"/g)].map((m) => m[1]);

		expect(viewBoxes.length).toBe(NAMES.length);
		expect(new Set(viewBoxes)).toEqual(new Set(["0 0 20 20"]));
	});

	it("uses currentColor only, so icons inherit their context", () => {
		expect(svg).not.toMatch(/(?:fill|stroke)="#[0-9a-f]{3,8}"/i);
	});

	it("keeps one optical weight across the whole set", () => {
		const widths = [...svg.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1]);

		expect(new Set(widths)).toEqual(new Set(["1.5"]));
	});
});

describe("Icon", () => {
	it("renders at 20px by default", () => {
		render(<Icon name="record" />);
		const svg = document.querySelector("svg");

		expect(svg).toHaveAttribute("width", "20");
		expect(svg).toHaveAttribute("height", "20");
	});

	it("honours an explicit size", () => {
		render(<Icon name="record" size={16} />);

		expect(document.querySelector("svg")).toHaveAttribute("width", "16");
	});

	it("is hidden from assistive tech when purely decorative", () => {
		render(<Icon name="record" />);

		expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("becomes an accessible image when given a label", () => {
		render(<Icon name="record" label="Iniciar gravação" />);

		expect(screen.getByRole("img", { name: "Iniciar gravação" })).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest --run src/design/icons/Icon.test.tsx`
Expected: FAIL — sprite e módulo inexistentes.

- [ ] **Step 3: Desenhar o sprite**

Criar `src/design/icons/sprite.svg` com um `<symbol>` por nome, todos em `viewBox="0 0 20 20"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Esqueleto com os dois primeiros já resolvidos:

```svg
<svg xmlns="http://www.w3.org/2000/svg" style="display: none">
	<symbol id="icon-record" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="10" cy="10" r="6" />
	</symbol>
	<symbol id="icon-stop" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<rect x="5" y="5" width="10" height="10" rx="2" />
	</symbol>
	<symbol id="icon-pause" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M7.5 5v10M12.5 5v10" />
	</symbol>
	<!-- settings, microphone, camera, close, minimize, check, folder,
	     chevron-right and drag-handle follow the same rules -->
</svg>
```

Desenhar os nove restantes seguindo as mesmas regras. Referência de peso óptico: nenhum símbolo pode parecer mais pesado ou mais leve que `icon-record` ao lado de um texto de 13px.

- [ ] **Step 4: Implementar o componente**

Criar `src/design/icons/Icon.tsx`:

> **Nota (fix wave pós-revisão):** a primeira versão deste passo importava
> `spriteUrl` de `"./sprite.svg"` e referenciava `<use href={`${spriteUrl}#icon-${name}`} />`.
> Isso quebra em build de produção: `sprite.svg` (2895 bytes) fica abaixo do
> `assetsInlineLimit` padrão do Vite (4096 bytes), então o Vite o inlina como
> uma `data:image/svg+xml,...` URI em build. O Chromium recusa resolver
> `<use>` contra uma `data:` URI externa (restrição de origem opaca), então
> todo ícone renderiza como uma caixa 0×0 em qualquer build real — confirmado
> em Electron/Chromium real, não pego pelos testes porque jsdom nunca resolve
> `<use>`. A versão correta abaixo inlina o próprio markup do sprite no
> documento uma vez (via `?raw`) e referencia apenas a âncora local
> `#icon-x`, que o Chromium resolve normalmente por ser same-document.

```tsx
import spriteMarkup from "./sprite.svg?raw";

/**
 * Mounts the icon sprite's raw SVG markup once, hidden, so every `<Icon>`'s
 * `<use href="#icon-x">` resolves against the current document. Mount once
 * near the app root (see src/App.tsx).
 */
export function IconSpriteProvider() {
	return <div style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: spriteMarkup }} />;
}

export type IconName =
	| "record"
	| "stop"
	| "pause"
	| "settings"
	| "microphone"
	| "camera"
	| "close"
	| "minimize"
	| "check"
	| "folder"
	| "chevron-right"
	| "drag-handle";

export interface IconProps {
	name: IconName;
	size?: 16 | 20 | 24;
	/** Provide only when the icon carries meaning no nearby text already carries. */
	label?: string;
	className?: string;
}

export function Icon({ name, size = 20, label, className }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			focusable="false"
		>
			<use href={`#icon-${name}`} />
		</svg>
	);
}
```

Mount `<IconSpriteProvider />` once near the app root (`src/App.tsx`), alongside the other top-level providers, so every `Icon` instance anywhere in the tree can resolve `#icon-x`.

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx vitest --run src/design/icons/Icon.test.tsx`
Expected: PASS, 8 testes.

`?raw` imports are already typed by Vite's built-in client types (`vite/client`, referenced from `src/vite-env.d.ts`) — no extra module declaration needed.

- [ ] **Step 6: Commit**

```bash
git add src/design/icons src/vite-env.d.ts
git commit -m "feat: add the Iris icon set and Icon component"
```

---

### Task 28: Guardrails que quebram o build

**Files:**
- Create: `src/design/guardrails/noRogueGlass.test.ts`
- Create: `src/design/guardrails/spacingScale.test.ts`
- Create: `src/design/guardrails/noBannedFonts.test.ts`

**Interfaces:**
- Consumes: `isValidSpacing` (Task 19), `GLASS_MARKER` (Task 25).
- Produces: nada — são testes que varrem o código-fonte.

Escopo: os guardrails cobrem `src/design/` e as superfícies já reconstruídas. As telas antigas ficam numa lista de exceções explícita, esvaziada conforme as Fases 3–6 avançam. Uma lista visível é o que torna a dívida contável.

Três guardrails da spec **não** entram aqui, porque precisam de componentes montados para ter o que verificar e nenhuma tela foi construída ainda: vidro aninhado (detectável via `GLASS_MARKER` numa árvore renderizada), área mínima de clique 32×32 e cobertura de `prefers-reduced-motion` por animação. Os três entram na Fase 3, junto com o primeiro componente real, e o `GLASS_MARKER` da Task 25 existe exatamente para tornar o primeiro deles possível.

- [ ] **Step 1: Escrever o guardrail de vidro**

Criar `src/design/guardrails/noRogueGlass.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Surfaces not yet rebuilt on the design layer. Shrinks to nothing as phases 3
 * to 6 land; nothing may ever be added to it.
 */
const LEGACY_ALLOWLIST = ["components", "hooks", "lib", "utils", "contexts"];

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			return LEGACY_ALLOWLIST.includes(path.relative(SRC, full)) ? [] : sourceFiles(full);
		}

		return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("glass guardrail", () => {
	const files = sourceFiles(SRC);

	it("finds files to check, so a broken walk can't pass silently", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it("never builds the glass material outside the Glass primitive", () => {
		const offenders = files.filter((file) => {
			if (file.includes(path.join("design", "glass"))) return false;

			const source = fs.readFileSync(file, "utf8");

			return /backdrop-filter|backdropFilter|backdrop-blur/.test(source);
		});

		expect(offenders).toEqual([]);
	});
});
```

- [ ] **Step 2: Rodar e confirmar que passa**

Run: `npx vitest --run src/design/guardrails/noRogueGlass.test.ts`
Expected: PASS. Se falhar apontando um arquivo em `src/design/`, mover a construção do material para dentro de `Glass.tsx`.

- [ ] **Step 3: Escrever o guardrail de espaçamento**

Criar `src/design/guardrails/spacingScale.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isValidSpacing } from "../tokens/space";

const DESIGN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const SPACING_PROPERTIES =
	/(?:margin|padding|gap|top|right|bottom|left)(?:Top|Right|Bottom|Left)?:\s*["']?(\d+)px/g;

function designFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) return designFiles(full);

		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("spacing guardrail", () => {
	it("uses only values from the base-4 scale in DESIGN.md section 6", () => {
		const offenders: string[] = [];

		for (const file of designFiles(DESIGN)) {
			const source = fs.readFileSync(file, "utf8");

			for (const match of source.matchAll(SPACING_PROPERTIES)) {
				if (!isValidSpacing(Number(match[1]))) {
					offenders.push(`${path.basename(file)}: ${match[0]}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
```

- [ ] **Step 4: Escrever o guardrail de fonte**

Criar `src/design/guardrails/noBannedFonts.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DESIGN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function designFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) return designFiles(full);

		return /\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("typography guardrail", () => {
	const sources = designFiles(DESIGN).map((file) => ({
		file: path.basename(file),
		source: fs.readFileSync(file, "utf8"),
	}));

	it("never uses a font weight above 700", () => {
		const offenders = sources.filter(({ source }) =>
			/font-?[wW]eight:\s*["']?(8\d\d|9\d\d|bolder)/.test(source),
		);

		expect(offenders.map((entry) => entry.file)).toEqual([]);
	});

	it("never references an Apple-licensed family", () => {
		const offenders = sources.filter(({ source }) =>
			/SF Pro|SF Mono|-apple-system|SF Symbols/.test(source),
		);

		expect(offenders.map((entry) => entry.file)).toEqual([]);
	});
});
```

- [ ] **Step 5: Rodar os três guardrails**

Run: `npx vitest --run src/design/guardrails`
Expected: PASS.

- [ ] **Step 6: Rodar a suíte inteira e o typecheck**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: PASS nos três.

- [ ] **Step 7: Commit**

```bash
git add src/design/guardrails
git commit -m "test: add design system guardrails that fail the build"
```

---

### Task 29: Fechar a fase

**Files:**
- Modify: `perf-budgets.json`
- Modify: `AGENTS.md`

- [ ] **Step 1: Medir**

Run: `npx vite build && npm run bench:ci`
Expected: exit 0. A camada de design acrescenta as fontes embarcadas ao bundle — se `bundle.total` estourar, subir esse orçamento pelo peso real das fontes e **anotar o motivo no commit**. Nenhum outro orçamento pode subir.

- [ ] **Step 2: Documentar a camada em `AGENTS.md`**

Na seção "Project layout", acrescentar:

```markdown
- `src/design/` — camada de design: tokens (fonte única em TS, geram CSS), fontes embarcadas, ícones, primitiva `Glass` e helpers de motion. Toda UI nova é construída sobre ela; os guardrails em `src/design/guardrails/` quebram o build fora dessas regras.
- `src/lib/perf/` — instrumentação de performance. Orçamentos em `perf-budgets.json`, comandos `npm run bench:*`.
```

- [ ] **Step 3: Rodar tudo**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run bench:ci`
Expected: PASS nos quatro.

- [ ] **Step 4: Commit**

```bash
git add perf-budgets.json AGENTS.md
git commit -m "docs: document the design and performance layers"
```

---

## O que vem depois

As Fases 3–7 ganham plano próprio, escrito quando a fase anterior fechar:

- **Fase 3 — HUD.** Primeira superfície sobre a camada de design, com a animação-assinatura do diafragma (§8) e o orçamento de re-render medido pela Task 6.
- **Fase 4 — Launch, source selector, countdown, notes.** Inclui a conversão de countdown e source selector em camadas, eliminando dois renderers. Essa parte do Pilar A da spec foi deslocada da Fase 1 para cá de propósito: reescrever essas janelas antes de existir a camada de design significaria reescrevê-las duas vezes.
- **Fase 5 — Editor.** Precisa de spec própria antes do plano: ~10k LOC, migração de estado para stores com seletores, quebra dos arquivos de 2000+ linhas.
- **Fase 6 — Timeline.**
- **Fase 7 — Endurecimento.** Aperto final dos orçamentos e emenda de `DESIGN.md` §4/§7, `UX-PRINCIPLES.md` Parte 5, `README.md`, `ROADMAP.md` e `CLAUDE.md`.
