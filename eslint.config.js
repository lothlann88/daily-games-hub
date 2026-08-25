// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    // Scope matches what `expo lint` linted: the app source. server/ is
    // PocketBase JSVM code with its own globals (migrate, BadRequestError);
    // pb_public and dist are build output; tools/ is shell and rig scripts.
    ignores: [
      "dist/*",
      "server/**",
      "tools/**",
      "scripts/**",
      ".expo/**",
      "expo-env.d.ts",
      "metro.config.cjs",
    ],
  },
]);
