# Marginnote 类型提示脚手架

说明：此脚手架展示如何在不引入任何运行时依赖的情况下，使用 `marginnote` 包提供的类型（`import type ...`）。

使用步骤：

1. 安装开发依赖：

   ```bash
   npm install
   # 或者只安装 typescript
   npm install --save-dev typescript
   ```

2. （可选）如果 `marginnote` 的类型单独发布在 `@types/marginnote`，请安装：

   ```bash
   npm install --save-dev @types/marginnote
   ```

3. 运行类型检查：

   ```bash
   npm run check
   ```

要点：
- 所有从 `marginnote` 的引用都使用 `import type` 或 `type` 导入，这样在编译后不会产生任何运行时导入。
- 请按需将 `tsconfig.json` 中 `types` 或 `typeRoots` 指向你的类型声明包（如果需要）。

全局 JSDoc 类型使用（不迁移到 TypeScript，且不使用任何 import）：

- 已添加 `types/marginnote-global.d.ts`，它将 `marginnote` 的类型别名暴露为全局类型（`MnDocument`、`Note` 等）。

示例（在 JS 文件中使用）：

```js
/** @type {MnDocument} */
const doc = /** ... */ null;

/**
 * @param {Note} note
 * @returns {string}
 */
function summarizeNote(note) {
  return note?.title ?? "<untitled>";
}
```

这样你可以在不添加任何运行时引用的情况下，在现有 `.js` 文件中获得类型提示和类型检查（需在 `tsconfig.json` 中启用 `allowJs` 和 `checkJs`）。
