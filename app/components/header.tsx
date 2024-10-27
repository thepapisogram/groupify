import Image from "next/image";
import { rubik_gemstones } from "@/app/ui/fonts";
import logo from '@/public/static/logo/logo.png'

const Header = ({ title, subtitle}:{title:string, subtitle:string}) => {
    return (
      <header className="grid gap-y-2 text-center px-5 md:px-10">
        <div className="flex items-center justify-center gap-x-3">
          <Image
            className="block"
            src={logo}
            width={50}
            height={50}
            alt="Groupify Logo"
          />
          <h1 className={`${rubik_gemstones.className} text-sky-600 dark:text-green-600 text-3xl md:text-5xl my-auto`}>{title}</h1>
        </div>
        <h2 className="text-stone-900 dark:text-zinc-300 font-medium mt-1 text-md md:text-lg">
          {subtitle}
        </h2>
      </header>
    );
}

export default Header;