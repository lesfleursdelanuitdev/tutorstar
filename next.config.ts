import os from "node:os";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Two developers share this checkout. A shared .next causes EPERM errors
  // when one user's dev server touches artifacts the other user's created,
  // so each user builds into their own directory.
  distDir: `.next-${os.userInfo().username}`,
};

export default nextConfig;
