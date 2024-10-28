import Link from "next/link";
// import Theme from "./theme";

const Footer = ({ author, href, title, year }:{ author:string, href:string, title:string, year:string }) => {
    return (
      <footer className="w-full text-center font-medium px-5 md:px-10">
        {/* <Theme /> */}
        <p className="text-sm text-slate-400 dark:text-zinc-600">
          &copy; Copyright {title} {year}
        </p>
        <p className="text-slate-500 dark:text-zinc-400 tracking-wide">
          Developed by{" "}
          <Link href={href} className="text-sky-600 dark:text-green-600">
            {author}
          </Link>
        </p>
      </footer>
    );
}

export default Footer;