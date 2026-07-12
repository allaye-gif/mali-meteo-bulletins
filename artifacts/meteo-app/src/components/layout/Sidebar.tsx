import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  FileText,
  History,
  PlusCircle,
  LogOut,
  Radio,
  Sun,
  Newspaper,
  Tv,
  Map as MapIcon,
  CloudSun,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const isCurrentPage = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
    { icon: PlusCircle, label: 'Nouveau bulletin', path: '/bulletins/nouveau' },
    { icon: History, label: 'Historique', path: '/historique' },
  ];

  const types = [
    { icon: Radio,     label: 'Radio',         type: 'radio' },
    { icon: Sun,       label: 'Matinal',        type: 'matinal' },
    { icon: Newspaper, label: 'Journaux',       type: 'journaux' },
    { icon: Tv,        label: 'ORTM',           type: 'ortm' },
    { icon: MapIcon,   label: 'National',       type: 'national' },
    { icon: Building2, label: 'Bamako 72h',     type: 'bamako72h' },
  ];

  return (
    <div className={cn('flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground', className)}>
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <CloudSun className="h-6 w-6 text-primary" />
          <span>MALI-METEO</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-4">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Navigation
          </div>
          {navItems.map((item) => (
            <Link key={item.path} href={item.path} className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCurrentPage(item.path) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
            )}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          <div className="mb-2 mt-8 px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Création Rapide
          </div>
          {types.map((t) => (
            <Link key={t.type} href={`/bulletins/nouveau?type=${t.type}`} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <t.icon className="h-4 w-4 text-muted-foreground" />
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/60">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">MM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sidebar-foreground">Prévisionniste</span>
            <span className="text-[10px] uppercase">Service National</span>
          </div>
        </div>
      </div>
    </div>
  );
}
