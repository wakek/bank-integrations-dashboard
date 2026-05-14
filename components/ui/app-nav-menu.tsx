"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Command } from "@solar-icons/react"

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  // { label: "Label", href: "/label1" },
  // { label: "Label", href: "/label2" },
  // { label: "Label", href: "/label3" },
]

export const AppNavMenu = () => {
  const pathname = usePathname()

  return (
    <div className="flex flex-row justify-center items-center flex-0 bg-zinc-50 font-sans dark:bg-black px-10 border-b">
      <Command size={30} className="mr-5" />
      <div className="max-w-7xl w-full flex flex-row items-center justify-start space-x-10 py-5">
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "border-none px-5",
                  active &&
                  "font-semibold bg-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800",
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
