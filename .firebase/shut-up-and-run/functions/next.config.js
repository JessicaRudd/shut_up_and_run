"use strict";

// ../next.config.js
var nextConfig = {
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: true
      }
    ];
  }
};
module.exports = nextConfig;
