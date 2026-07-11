import React from 'react';
import { useListBulletins, useDeleteBulletin, useDuplicateBulletin, BulletinType } from '@workspace/api-client-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  FileEdit, 
  Trash2, 
  Copy, 
  Radio, 
  Sun, 
  Newspaper, 
  Tv, 
  Map as MapIcon 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from '@tanstack/react-query';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'radio': return <Radio className="w-4 h-4 mr-1 text-blue-500" />;
    case 'matinal': return <Sun className="w-4 h-4 mr-1 text-orange-500" />;
    case 'journaux': return <Newspaper className="w-4 h-4 mr-1 text-emerald-500" />;
    case 'ortm': return <Tv className="w-4 h-4 mr-1 text-purple-500" />;
    case 'national': return <MapIcon className="w-4 h-4 mr-1 text-red-500" />;
    default: return null;
  }
};

export function Historique() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: bulletins, isLoading, refetch } = useListBulletins();
  const deleteMutation = useDeleteBulletin();
  const duplicateMutation = useDuplicateBulletin();

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Bulletin supprimé" });
      refetch();
    } catch (err) {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      const res = await duplicateMutation.mutateAsync({ id });
      toast({ title: "Bulletin dupliqué avec succès" });
      setLocation(`/bulletins/${res.id}/edit`);
    } catch (err) {
      toast({ title: "Erreur lors de la duplication", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-muted/30 p-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Historique des bulletins</h1>
            <p className="text-muted-foreground mt-1">
              Consultez et gérez les archives de production.
            </p>
          </div>
          <Button onClick={() => setLocation('/bulletins/nouveau')}>
            Nouveau Bulletin
          </Button>
        </div>

        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : bulletins?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    Aucun bulletin trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                bulletins?.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center capitalize font-medium text-sm">
                        {getTypeIcon(b.type)}
                        {b.type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(b.createdAt), 'dd/MM/yyyy à HH:mm')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {b.validiteLabel}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => setLocation(`/bulletins/${b.id}/edit`)}>
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(b.id)} title="Dupliquer">
                        <Copy className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce bulletin ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le bulletin {b.type} du {b.bulletinDate} sera supprimé.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(b.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
