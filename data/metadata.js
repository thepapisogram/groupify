const author = {
    name: "Anthony Saah",
    url: "https://anthonysaah.me",
}

const app = {
    name: "Groupify",
    version: "2.2.0",
    tagline: "Make fair groups in seconds",
    description: "Groupify splits any list into fair, balanced groups in seconds. Keep friends together, keep others apart, spread skill levels evenly, collect names with a shareable form, then download the result or share it. Free, and no account needed. Made for classrooms, workshops, teams and events.",
    applicationName: "Groupify",
    keywords: [
        "group maker",
        "random group generator",
        "team generator",
        "split into groups",
        "class groups",
        "classroom tool",
        "team picker",
        "balanced teams",
        "workshop groups",
        "hackathon teams",
        "groupify",
    ],
    /** Used when NEXT_PUBLIC_APP_URL isn't set. */
    defaultUrl: "https://groupify.anthonysaah.me",
}

const main = {
    title: {
        default: `${app.name} - ${app.tagline}`,
        template: `%s | ${app.name}`,
    },
    description: app.description,
    lang: "en",
    charset: "UTF-8",
    authors: [{ name: author.name, url: author.url }],
    generator: "Next.js",
    publisher: author.name,
    creator: author.name,
    keywords: app.keywords,
    applicationName: app.applicationName,
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
    openGraph: {
        type: "website",
        siteName: app.name,
        title: `${app.name} - ${app.tagline}`,
        description: app.description,
    },
    twitter: {
        card: "summary_large_image",
        title: `${app.name} - ${app.tagline}`,
        description: app.description,
    },
}

const appMeta = {
    app,
    author,
    main,
}

export default appMeta;
