/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

import "./src/env.js";

const { IMAGE_HOSTS } = require("./src/_config/imageHosts");

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: "https",
      hostname,
    })),
  },
};

export default config;

