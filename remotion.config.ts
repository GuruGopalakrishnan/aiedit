import path from "node:path";
import { Config } from "@remotion/cli/config";

// Remotion's own bundler doesn't read tsconfig.json's "paths", so the "@/*"
// alias used throughout src/ has to be registered here explicitly.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      "@": path.resolve(process.cwd(), "src"),
    },
  },
}));
