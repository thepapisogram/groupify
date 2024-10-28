import Image from "next/image";
import {rubik_gemstones } from "@/app/ui/fonts";

const Header = ({ title}:{title:string}) => {
    return (
      <header className="grid gap-y-2 text-center px-5 md:px-10 mt-5 mb-10">
        <div className="flex items-center justify-center gap-x-3">
          <Image
            className="block"
            src="/logo.png"
            width={70}
            height={70}
            alt="Groupify Logo"
            unoptimized
          />
          <h1
            className={`${rubik_gemstones.className} text-sky-600 dark:text-teal-600 text-4xl md:text-5xl my-auto`}
          >
            {title}
          </h1>
        </div>
      </header>
    );
}

export default Header;