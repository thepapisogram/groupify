const Header = ({ title, subtitle}:{title:string, subtitle:string}) => {
    return (
      <header className="grid gap-y-2 text-center">
        <h1 className="text-sky-600 dark:text-green-600 text-5xl font-bold">{title}</h1>
        <h2 className="text-stone-900 dark:text-zinc-300 font-medium text-lg md:text-lg">
          {subtitle}
        </h2>
      </header>
    );
}

export default Header;