import Header from "./components/header";
import Body from "./components/body";

import appmeta from "./data/appmeta";
import Footer from "./components/footer";

export default function Home() {

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center">
      <Header title={appmeta.app.title} subtitle={appmeta.app.subtitle} />
      <Body />
      <Footer
        author={appmeta.app.author}
        href={appmeta.app.portfolio}
        title={appmeta.app.title}
        year={appmeta.app.year}
      />
    </main>
  );
}