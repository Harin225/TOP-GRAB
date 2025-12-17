"use client"

import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage, 
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, ChevronRight } from "lucide-react"

interface BreadcrumbNavProps {
  items: { label: string; href?: string; current?: boolean }[]
  className?: string
  hideHome?: boolean
}

export function BreadcrumbNav({ items, className, hideHome = false }: BreadcrumbNavProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {!hideHome && (
          <BreadcrumbLink href="/" className="flex items-center gap-1">
            <Home className="h-4 w-4" />
            Home
          </BreadcrumbLink>
        )}

        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            {(index > 0 || !hideHome) && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            )}
            {item.current ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
