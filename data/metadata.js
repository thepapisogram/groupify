const author = {
    name: "Anthony Saah",
    url: "https://anthonysaah.me",
}

const app = {
    name: "Groupify",
    version: "2.0",
    keywords: ["groupify", "groupify tool", "grouping", "classroom", "tool", author.name],
}

const main = {
    title: `${app.name}`,
    description: "A tool to sort names into groups, sample usage; a classroom setting where the class captain needs to split the class into groups of 5. Developed by Anthony Saah",
    applicationName: "Groupify",
    authors: [{ name: author.name, url: author.url }],
    generator: "Next.js",
    publisher: author.name,
    creator: author.name,
    keywords: app.keywords,
    // referrer: "origin",
    // themeColor: "#ffffff",
    // colorScheme: "light",
    // robots: "index, follow",
    // openGraph: {
    //   title: "Groupify",
    //   description: "A tool to sort names into groups, sample usage; a classroom setting where the class captain needs to split the class into groups of 5.",
    //   url: "https://groupify.com",
    //   siteName: "Groupify",
    //   images: [
    //     {
    //       url: "https://groupify.com/og-image.jpg",
    //       width: 800,
    //       height: 600,
    //       alt: "Groupify",
    //     },
    //   ],
    //   locale: "en_US",
    //   type: "website",
    // },
    // twitter: {
    //   card: "summary_large_image",
    //   site: "@groupify",
    //   creator: "@creator",
    //   title: "Groupify",
    //   description: "A tool to sort names into groups, sample usage; a classroom setting where the class captain needs to split the class into groups of 5.",
    //   images: ["https://groupify.com/twitter-image.jpg"],
    // },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/favicon.ico",
    },
    // manifest: "/site.webmanifest",
}

const appMeta = {
    app,
    author,
    main
}

export default appMeta;