// Global helper for MarginNote addons: `self` inside JSB.defineClass instance methods.
// This allows `self` to be used in JS files and gives it the JSExtension type.
// Keep it minimal so it won't conflict with other definitions.

declare global {
  /**
   * `self` refers to the current addon instance inside JSB.defineClass instance methods.
   * It exposes `window` and any other properties you attach to the instance.
   */
  const self: JSExtension & { window?: UIWindow } & Record<string, any>;
}

export {};
