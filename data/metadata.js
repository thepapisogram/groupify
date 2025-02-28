const author = {
    name: "Anthony Saah",
    url: "https://anthonysaah.me",
}

const app = {
    name: "Groupify",
    version: "2.0",
    description: "Groupify is an innovative tool designed to effortlessly sort names into groups. Perfect for classroom settings, it helps class captains quickly and efficiently split the class into groups of 5. Developed by Anthony Saah, Groupify streamlines group organization with ease.",
    applicationName: "Groupify",
    keywords: ["groupify", "groupify tool", "grouping", "classroom", "tool", author.name],
}

const main = {
    title: app.name,
    description: app.description,
    lang: "en",
    charset: "UTF-8",
    authors: [{ name: author.name, url: author.url }],
    generator: "Next.js",
    publisher: author.name,
    creator: author.name,
    keywords: app.keywords,
    referrer: "origin",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
    // colorScheme: "light",
    // robots: "index, follow",
    // openGraph: {
    //   title: "Groupify",
    //   description: "Groupify is an innovative tool designed to effortlessly sort names into groups. Perfect for classroom settings, it helps class captains quickly and efficiently split the class into groups of 5.",
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
    //   description: "Groupify is an innovative tool designed to effortlessly sort names into groups. Perfect for classroom settings, it helps class captains quickly and efficiently split the class into groups of 5.",
    //   images: ["https://groupify.com/twitter-image.jpg"],
    // },
    // manifest: "/site.webmanifest",
}

const viewport = "width=device-width, initial-scale=1.0";
const themeColor = "#0f172a";

const appMeta = {
    app,
    author,
    main,
    viewport,
    themeColor
}

export default appMeta;