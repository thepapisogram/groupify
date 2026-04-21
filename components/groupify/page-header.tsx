import Image from "next/image";
import Link from "next/link";
import appMeta from "@/data/metadata";
import { ModeToggle } from "@/components/theme-switcher";

export function PageHeader() {
  return (
    <header className="mb-10 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="relative rounded-2xl border border-border/50 bg-card/80 p-3 backdrop-blur-sm">
              <Image
                src="/logo.webp"
                width={36}
                height={36}
                alt="Groupify"
                className="size-9"
                priority
              />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Groupify
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Sort names into balanced groups instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={appMeta.author.url}
            target="_blank"
            className="hidden rounded-xl border border-border/50 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-primary sm:block"
          >
            by {appMeta.author.name}
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
