import appMeta from "@/data/metadata"
import { Sigmar } from "next/font/google"
import Image from "next/image";

const rubik = Sigmar({ weight: "400", subsets: ["latin"] });

const Header = () => {
  return (
    <header className="col-span-full">
        <span className="flex justify-center items-center">
            <Image className="w-auto h-auto" src="/favicon.ico" width={50} height={50} alt="logo" />
        </span>
        <h1 className={`${rubik.className} text-3xl tracking-widest font-extrabold capitalize text-white dark:text-cyan-500 text-center`}>{appMeta.app.name}</h1>
    </header>
  )
}

export default Header