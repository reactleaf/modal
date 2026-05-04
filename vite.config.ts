import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    dts({
      entryRoot: "src",
      outDirs: "dist",
      tsconfigPath: "./tsconfig.json",
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["classnames", "react", "react-dom", "react/jsx-runtime"],
    },
    sourcemap: true,
  },
});
