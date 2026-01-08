
import React, { useState } from 'react';
import { groupsService } from '@/services/groups.service';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { validateGroupName } from '@/utils/validators';

export default function GroupForm({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const val = validateGroupName(name);
    if (!val.valid) {
        toast({ variant: "destructive", description: val.error });
        return;
    }

    setLoading(true);
    const result = await groupsService.createGroup({
        name,
        description,
        created_by: user.id
    }, user.id); // Pass user.id to auto-add as admin
    setLoading(false);

    if (result.success) {
      toast({ title: "Éxito", description: result.message });
      setOpen(false);
      setName('');
      setDescription('');
      if (onSuccess) onSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-900 text-white hover:bg-blue-800">Crear Grupo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nombre del Grupo *</label>
            <input 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
              placeholder="Ej: Equipo de Ventas"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descripción</label>
            <textarea 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" 
              placeholder="Propósito del grupo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-blue-900 text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Crear Grupo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
