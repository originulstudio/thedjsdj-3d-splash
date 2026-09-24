import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://thedjsdj-3d-splash.vercel.app",
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
});
