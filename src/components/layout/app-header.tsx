"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { SignOutButton } from "./sign-out-button";
import type { UserRole } from "@/types/database";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppHeader({
  email,
  fullName,
  role,
  alertCount = 0,
}: {
  email: string;
  fullName: string;
  role: UserRole;
  alertCount?: number;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <MobileNav role={role} alertCount={alertCount} />
        <Breadcrumbs />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-secondary shrink-0">
          <div className="hidden text-right text-sm leading-tight sm:block">
            <p className="font-medium text-foreground">{fullName}</p>
            <p className="capitalize text-muted-foreground">{role}</p>
          </div>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-brand-primary text-white">
              {initials(fullName) || "U"}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{fullName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <SignOutButton />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
