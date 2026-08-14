const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  logLevel: "info",
};

async function main() {
  const extension = await esbuild.context({
    ...common,
    entryPoints: ["src/extension.ts"],
    format: "cjs",
    platform: "node",
    target: "node18",
    outfile: "dist/extension.js",
    external: ["vscode"],
  });

  const webview = await esbuild.context({
    ...common,
    entryPoints: ["src/webview.ts"],
    format: "iife",
    platform: "browser",
    target: "es2020",
    outfile: "media/webview.js",
    define: { "process.env.NODE_ENV": production ? '"production"' : '"development"' },
  });

  if (watch) {
    await extension.watch();
    await webview.watch();
  } else {
    await extension.rebuild();
    await webview.rebuild();
    await extension.dispose();
    await webview.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
