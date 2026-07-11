import React from 'react';
import { useGetBulletinStats, useListBulletins } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  FileText,
  Radio,
  Sun,
  Newspaper,
  Tv,
  Map as MapIcon,
  ChevronRight,
  PlusCircle,
  FileEdit,
  CloudSun
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const typeConfig = {
  radio: { icon: Radio, label: 'Radio', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  matinal: { icon: Sun, label: 'Matinal', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  journaux: { icon: Newspaper, label: 'Journaux', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ortm: { icon: Tv, label: 'ORTM', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  national: { icon: MapIcon, label: 'National', color: 'text-red-500', bg: 'bg-red-500/10' },
};

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetBulletinStats();
  const { data: recentBulletins, isLoading: listLoading } = useListBulletins({ limit: 5 });

  return (
    <div className="flex-1 overflow-auto bg-muted/30">
      <div className="container mx-auto p-6 max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Générez et gérez les bulletins météorologiques officiels du Mali.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Object.entries(typeConfig).map(([typeKey, config]) => {
            const Icon = config.icon;
            const count = stats?.parType?.[typeKey] || 0;
            return (
              <Card key={typeKey} className="border-border/50 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <div className={`p-2 rounded-md ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">bulletins créés</p>
                  <Button variant="ghost" size="sm" className="w-full mt-4 justify-between" asChild>
                    <Link href={`/bulletins/nouveau?type=${typeKey}`}>
                      Créer
                      <PlusCircle className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Bulletins Récents</CardTitle>
              <CardDescription>Les 5 derniers bulletins générés.</CardDescription>
            </CardHeader>
            <CardContent>
              {listLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentBulletins?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun bulletin pour le moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBulletins?.map((bulletin) => {
                    const t = bulletin.type as keyof typeof typeConfig;
                    const config = typeConfig[t] || { icon: FileText, label: t, color: '', bg: 'bg-muted' };
                    const Icon = config.icon;
                    return (
                      <div key={bulletin.id} className="flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {config.label} du {format(parseISO(bulletin.bulletinDate), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Valide: {bulletin.validiteLabel}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/bulletins/${bulletin.id}/edit`}>
                            <FileEdit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" className="w-full mt-6" asChild>
                <Link href="/historique">
                  Voir tout l'historique
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-sm border-none">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
              <CloudSun className="w-64 h-64" />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">MALI-METEO</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Agence Nationale de la Météorologie du Mali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm/relaxed text-primary-foreground/90">
                Outil de production des bulletins météorologiques officiels. Ce système garantit le formatage exact et la conservation de l'historique des données.
              </p>
              <div className="bg-primary-foreground/10 rounded-lg p-4 mt-6 backdrop-blur-sm">
                <h4 className="font-semibold text-sm mb-2">Instructions</h4>
                <ul className="text-xs space-y-2 text-primary-foreground/80 list-disc pl-4">
                  <li>Sélectionnez un type de bulletin pour commencer.</li>
                  <li>Les données de ville sont conservées dans la session pour accélérer la saisie.</li>
                  <li>L'aperçu en temps réel reflète exactement le PDF final.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
