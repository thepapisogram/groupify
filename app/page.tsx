import Header from "./components/header";
import Body from "./components/body";

import appmeta from "./data/appmeta";
import Footer from "./components/footer";
import Help from "./components/help";

export default function Home() {

  return (
    <main className="bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center py-10 w-full h-full">
      <Header title={appmeta.app.title} />
      <Body />
      <Footer
        author={appmeta.app.author}
        href={appmeta.app.portfolio}
        title={appmeta.app.title}
        year={appmeta.app.year}
      />
      <Help />
    </main>
  );
}