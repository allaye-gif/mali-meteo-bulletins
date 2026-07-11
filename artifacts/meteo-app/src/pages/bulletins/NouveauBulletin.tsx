import React, { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Radio,
  Sun,
  Newspaper,
  Tv,
  Map as MapIcon,
  ChevronLeft
} from 'lucide-react';
import { useCreateBulletin, BulletinInputType } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getInitialVilleData, getInitialVigilanceData } from '@/lib/constants';

const types = [
  { id: 'radio', icon: Radio, title: 'Bulletin Radio', desc: 'Situation générale et températures min/max. Spécialement formaté pour la lecture à l\'antenne.' },
  { id: 'matinal', icon: Sun, title: 'Bulletin Matinal', desc: 'Situation générale et températures maximales uniquement.' },
  { id: 'journaux', icon: Newspaper, title: 'Bulletin Journaux', desc: 'Avec carte de vigilance, conditions météo par ville et icônes.' },
  { id: 'ortm', icon: Tv, title: 'Bulletin ORTM', desc: 'Formaté pour l\'affichage à la télévision avec carte du Mali et données superposées.' },
  { id: 'national', icon: MapIcon, title: 'Bulletin National', desc: 'Document complet en 2 pages: Situation avec carte + tableau détaillé des températures.' },
];

export function NouveauBulletin() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const typeQuery = searchParams.get('type');
  
  const createMutation = useCreateBulletin();

  const handleSelectType = async (type: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const periodLabel = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    
    let validiteLabel = "demain 18h TU";
    if (type === 'matinal') validiteLabel = "aujourd'hui 18h TU";
    if (type === 'radio') validiteLabel = "demain 12h TU";

    const payload = {
      type: type as BulletinInputType,
      bulletinDate: today,
      periodLabel,
      validiteLabel,
      heureLabel: type === 'radio' ? '12h TU' : null,
      situationGenerale: {
        ciel: '',
        vents: '',
        visibilite: '',
        orages: null,
        temperatures: ''
      },
      donneesVilles: getInitialVilleData(),
      vigilanceNiveaux: type === 'journaux' ? getInitialVigilanceData() : undefined
    };

    try {
      const res = await createMutation.mutateAsync({ data: payload });
      setLocation(`/bulletins/${res.id}/edit`);
    } catch (err) {
      console.error("Failed to create bulletin", err);
    }
  };

  // If a type was passed in URL and we haven't clicked yet, we could auto-create, 
  // but to be safe and give the user a clear flow, we just let them click it or we can auto-trigger it.
  // For better UX, we'll let them click.

  return (
    <div className="flex-1 overflow-auto bg-muted/30 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouveau Bulletin</h1>
            <p className="text-muted-foreground">Sélectionnez le type de bulletin à créer.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {types.map((t) => {
            const Icon = t.icon;
            const isSelected = typeQuery === t.id;
            return (
              <Card 
                key={t.id} 
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => handleSelectType(t.id)}
              >
                <CardHeader className="flex flex-row items-start space-x-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription className="mt-1">{t.desc}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant={isSelected ? "default" : "secondary"}
                    disabled={createMutation.isPending}
                  >
                    Créer ce bulletin
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
