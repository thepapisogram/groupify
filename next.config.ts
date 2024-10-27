module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000", // or your development server port
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "https://groupify-tool.netlify.app", // replace with your live domain
        pathname: "/**",
      },
    ],
  },
};
