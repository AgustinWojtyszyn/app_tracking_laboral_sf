
import React, { useState, useEffect } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Users, Trash2, Calendar, ShieldCheck, User, Eye, Edit2 } from 'lucide-react';
import GroupForm from '@/components/groups/GroupForm';
import GroupMembers from '@/components/groups/GroupMembers';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { jobsService } from '@/services/jobs.service';
import { formatCurrency, formatDate } from '@/utils/formatters';
import JobDetailModal from '@/components/jobs/JobDetailModal';
import JobForm from '@/components/jobs/JobForm';
import { getMonthStart, getMonthEnd } from '@/utils/dates';

export default function GroupsPage() {
    const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
    const { getGroups, deleteGroup, requestToJoin } = useGroups();
  const { t } = useLanguage();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
    const [joiningGroupId, setJoiningGroupId] = useState(null);
  const [jobsModalOpen, setJobsModalOpen] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [groupJobs, setGroupJobs] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
        const result = await getGroups(user?.id);
    if (result.success) {
        setGroups(result.data);
    } else {
        addToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
      const result = await deleteGroup(id);
      if (result.success) {
          addToast(result.message, 'success');
          fetchGroups();
      } else {
          addToast(result.error, 'error');
      }
  };

  const handleJoinRequest = async (groupId) => {
      if (!user) return;
      if (!groupId) {
        addToast('Debes seleccionar un grupo antes de enviar la solicitud.', 'error');
        console.warn('handleJoinRequest - sin groupId, abortando');
        return;
      }
      console.log('handleJoinRequest - intentando crear solicitud', { groupId, userId: user.id });
      setJoiningGroupId(groupId);
      const result = await requestToJoin(groupId, user.id);
      setJoiningGroupId(null);
      if (result.success) {
          addToast(result.message, 'success');
          fetchGroups();
      } else {
          addToast(result.error, 'error');
      }
  };

  const openGroupJobs = async (group) => {
    setActiveGroup(group);
    setJobsModalOpen(true);
    setJobsLoading(true);
    const start = getMonthStart();
    const end = getMonthEnd();
    const result = await jobsService.getJobsByDateRange(start, end, { groupId: group.id, currentUserId: user?.id });
    if (result.success) {
      setGroupJobs(result.data || []);
    } else {
      addToast(result.error || 'No se pudieron cargar las solicitudes.', 'error');
    }
    setJobsLoading(false);
  };

  return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
        <div>
	        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-slate-50">{t('groupsPage.title')}</h1>
	        <p className="text-base md:text-lg text-gray-500 dark:text-slate-300">{t('groupsPage.subtitle')}</p>
        </div>
        <GroupForm onSuccess={fetchGroups} />
      </div>

      {loading ? (
          <LoadingSpinner />
      ) : groups.length === 0 ? (
          <div className="p-18 text-center bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-slate-800 flex flex-col items-center gap-3">
              <div className="w-18 h-18 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                 <Users className="w-10 h-10 text-blue-300 dark:text-blue-200" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-50">{t('groupsPage.emptyTitle')}</h3>
              <p className="text-base text-gray-500 dark:text-slate-300 max-w-sm mt-1 mb-6">{t('groupsPage.emptyDesc')}</p>
              <GroupForm onSuccess={fetchGroups} />
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => {
                  const isCreator = group.created_by === user.id;
                  const isMember = !!group.isMember;
                  const isGroupAdmin = isCreator || isAdmin; // Admin global o creador pueden gestionar miembros
                  const memberCountRaw = typeof group.memberCount === 'number'
                    ? group.memberCount
                    : group.group_members?.[0]?.count || 0;
                  const memberCount = Math.max(memberCountRaw, group.created_by ? 1 : 0);
                  const pendingRequests = group.pendingRequests || 0;
                  const requestStatus = group.requestStatus;
                  const canManageGroup = isGroupAdmin;

                  return (
                    <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 group-card overflow-hidden flex flex-col h-full card-lg">
                        <div className="flex-1 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700 rounded-lg shadow-sm">
                                    <Users className="w-6 h-6 text-[#1e3a8a] dark:text-blue-200" />
                                </div>
                                {isCreator && (
                                    <span className="text-xs md:text-sm font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700">
                                        {t('groupsPage.adminBadge')}
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="font-bold text-xl text-gray-900 dark:text-slate-50 mb-2">{group.name}</h3>
                            <p className="text-base text-gray-500 dark:text-slate-300 line-clamp-2">{group.description || t('groupsPage.noDescription')}</p>
                            
                            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-300">
                                <div className="flex items-center" title={t('groupsPage.membersLabel')}>
                                    <User className="w-4 h-4 mr-1.5" /> 
                                    {memberCount} {t('groupsPage.membersLabel')}
                                </div>
                                <div className="flex items-center" title={t('groupsPage.creationLabel')}>
                                    <Calendar className="w-4 h-4 mr-1.5" /> 
                                    {new Date(group.created_at).toLocaleDateString()}
                                </div>
                                {(isCreator || isMember) && (
                                  <div className="flex items-center" title="Solicitudes pendientes">
                                    <ShieldCheck className="w-4 h-4 mr-1.5" /> 
                                    {pendingRequests} solicitudes
                                  </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800 p-4 border-t border-gray-100 dark:border-slate-700 flex gap-2">
                            {canManageGroup && (
                              <Dialog>
                                  <DialogTrigger asChild>
                                      <Button 
                                        variant="default" 
                                        size="sm" 
                                        className="flex-1 bg-[#1e3a8a] hover:bg-blue-900 text-white text-sm md:text-base py-2.5 flex items-center justify-center gap-2" 
                                      >
                                          <ShieldCheck className="w-5 h-5" />
                                          {t('groupsPage.manageMembers')}
                                      </Button>
                                  </DialogTrigger>
                                  <DialogContent className="top-[5vh] translate-y-0 -translate-x-1/2 left-1/2 w-[95vw] sm:w-[860px] max-w-5xl bg-white dark:bg-slate-900 p-0 max-h-[90vh] overflow-y-auto">
                                          <DialogHeader className="p-0">
                                              <div className="p-6 bg-[#1e3a8a] text-white">
                                                  <DialogTitle className="text-xl font-bold">Gestionar Grupo</DialogTitle>
                                                  <p className="text-blue-200 text-sm">{group.name}</p>
                                              </div>
                                          </DialogHeader>
                                          <div className="p-6 bg-white dark:bg-slate-900">
                                              <GroupMembers
                                                group={group}
                                                onClose={() => {}}
                                                isGroupAdmin={isGroupAdmin}
                                                isCreator={isCreator}
                                                isMember={isMember}
                                                onMembersUpdated={(count) => {
                                                  setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, memberCount: count } : g));
                                                }}
                                                onGroupUpdated={(updated) => {
                                                  setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, ...updated } : g));
                                                }}
                                              />
                                          </div>
                                  </DialogContent>
                              </Dialog>
                            )}

                            {!isMember && (
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1 bg-[#1e3a8a] hover:bg-blue-900 text-white text-sm md:text-base py-2.5 flex items-center justify-center gap-2"
                                onClick={() => handleJoinRequest(group.id)}
                                disabled={joiningGroupId === group.id || requestStatus === 'pending' || isCreator}
                              >
                                <ShieldCheck className="w-5 h-5" />
                                {isCreator
                                  ? 'Eres el creador'
                                  : joiningGroupId === group.id 
                                    ? 'Enviando solicitud...' 
                                    : requestStatus === 'pending'
                                      ? 'Solicitud enviada'
                                      : 'Unirme'}
                              </Button>
                            )}

                            {(isMember || isCreator) && (
                              <Dialog open={jobsModalOpen && activeGroup?.id === group.id} onOpenChange={(open) => {
                                if (!open) {
                                  setJobsModalOpen(false);
                                  setActiveGroup(null);
                                  setGroupJobs([]);
                                  setSelectedJob(null);
                                  setEditingJob(null);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-sm md:text-base py-2.5 flex items-center justify-center gap-2 border-blue-200 text-[#1e3a8a]"
                                    onClick={() => openGroupJobs(group)}
                                  >
                                    <Eye className="w-5 h-5" />
                                    Ver solicitudes
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl bg-white dark:bg-slate-900 p-0 overflow-hidden">
                                  <DialogHeader className="p-0">
                                    <div className="p-6 bg-[#1e3a8a] text-white">
                                      <DialogTitle className="text-xl font-bold">Solicitudes del grupo</DialogTitle>
                                      <p className="text-blue-200 text-sm">{group.name}</p>
                                    </div>
                                  </DialogHeader>
                                  <div className="p-6 bg-white dark:bg-slate-900">
                                    {jobsLoading ? (
                                      <div className="py-10 flex justify-center">
                                        <LoadingSpinner />
                                      </div>
                                    ) : groupJobs.length === 0 ? (
                                      <div className="text-center text-gray-500 dark:text-slate-300 py-10">
                                        No hay solicitudes en este rango.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm text-left">
                                          <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-100 uppercase font-semibold border-b border-gray-200 dark:border-slate-700">
                                            <tr>
                                              <th className="px-3 py-3">Fecha</th>
                                              <th className="px-3 py-3">Descripción</th>
                                              <th className="px-3 py-3">Lugar</th>
                                              <th className="px-3 py-3">Creador</th>
                                              <th className="px-3 py-3">Trabajador</th>
                                              <th className="px-3 py-3 text-right">Horas</th>
                                              <th className="px-3 py-3 text-right">Cobrar</th>
                                              <th className="px-3 py-3 text-center">Estado</th>
                                              <th className="px-3 py-3 text-center">Acciones</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {groupJobs.map((job) => (
                                              <tr key={job.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/60 transition-colors">
                                                <td className="px-3 py-3">{formatDate(job.date)}</td>
                                                <td className="px-3 py-3 font-semibold">{job.description}</td>
                                                <td className="px-3 py-3">{job.location || '-'}</td>
                                                <td className="px-3 py-3">{job.creator?.full_name || job.creator?.email || '-'}</td>
                                                <td className="px-3 py-3">{job.workers?.display_name || job.workers?.alias || '-'}</td>
                                                <td className="px-3 py-3 text-right">{job.hours_worked}</td>
                                                <td className="px-3 py-3 text-right">{formatCurrency(job.amount_to_charge)}</td>
                                                <td className="px-3 py-3 text-center">
                                                  <span className={`text-[11px] px-3 py-1.5 rounded-full font-semibold ${
                                                    job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    job.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                  }`}>
                                                    {job.status === 'pending' ? 'Pendiente' : job.status === 'completed' ? 'Completado' : 'Archivado'}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                  <div className="flex justify-center gap-2">
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => setSelectedJob(job)}
                                                      className="h-9 px-3 rounded-full text-[#1e3a8a] border-blue-200 text-xs font-semibold shadow-sm"
                                                    >
                                                      <Eye className="w-4 h-4 mr-1" /> Ver
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={() => setEditingJob(job)}
                                                      disabled={!job.editable_by_group && job.user_id !== user?.id}
                                                      className="h-9 px-3 rounded-full bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                                                    >
                                                      <Edit2 className="w-4 h-4 mr-1" /> Editar
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            {!canManageGroup && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1 text-sm md:text-base py-2.5 flex items-center justify-center gap-2"
                                  >
                                    <ShieldCheck className="w-5 h-5" />
                                    Ver grupo
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="top-[5vh] translate-y-0 -translate-x-1/2 left-1/2 w-[95vw] sm:w-[860px] max-w-5xl bg-white dark:bg-slate-900 p-0 max-h-[90vh] overflow-y-auto">
                                        <DialogHeader className="p-0">
                                            <div className="p-6 bg-[#1e3a8a] text-white">
                                                <DialogTitle className="text-xl font-bold">Grupo</DialogTitle>
                                                <p className="text-blue-200 text-sm">{group.name}</p>
                                            </div>
                                        </DialogHeader>
                                        <div className="p-6 bg-white dark:bg-slate-900">
                                            <GroupMembers
                                              group={group}
                                              onClose={() => {}}
                                              isGroupAdmin={false}
                                              isCreator={false}
                                              isMember={isMember}
                                              onMembersUpdated={(count) => {
                                                setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, memberCount: count } : g));
                                              }}
                                              onGroupUpdated={(updated) => {
                                                setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, ...updated } : g));
                                              }}
                                            />
                                        </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            {isGroupAdmin && (
                                <ConfirmationModal
                                    title={t('groupsPage.deleteTitle')}
                                    description={t('groupsPage.deleteDesc')}
                                    confirmLabel="Sí, eliminar"
                                    onConfirm={() => handleDelete(group.id)}
                                    trigger={
                                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </div>
                  );
              })}
          </div>
      )}
      {editingJob && (
        <JobForm
          jobToEdit={editingJob}
          onSuccess={() => {
            setEditingJob(null);
            // refresh jobs modal data if open
            if (activeGroup) {
              openGroupJobs(activeGroup);
            }
          }}
        />
      )}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onEdit={(job) => {
            setSelectedJob(null);
            setEditingJob(job);
          }}
        />
      )}
    </div>
  );
}
