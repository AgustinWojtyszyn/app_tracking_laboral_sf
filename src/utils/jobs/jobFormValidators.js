import { validateAmount, validateCost } from '@/utils/validators';
import { validateJobImageDrafts } from '@/utils/jobImageAttachments';

export const validateJobForm = ({ formData, workerId, imageAttachments }) => {
  const newErrors = {};
  const nextImageErrors = validateJobImageDrafts(imageAttachments);
  const location = (formData.location || '').trim();
  const title = (formData.title || '').trim();
  const requester = (formData.requested_by || '').trim();
  const description = (formData.description || '').trim();
  const status = (formData.status || '').trim();
  const actionType = (formData.action_type || '').trim();
  const sectorType = (formData.sector_type || '').trim();
  const sectorCustom = (formData.sector_custom || '').trim();
  const costValue = (formData.cost_spent ?? '').toString().trim();
  const chargeValue = (formData.amount_to_charge ?? '').toString().trim();

  if (!formData.date) newErrors.date = 'La fecha es requerida';
  if (title.length > 120) newErrors.title = 'El título no puede superar los 120 caracteres';
  if (!status) newErrors.status = 'Seleccioná un estado';
  if (!location) newErrors.location = 'La ubicación es requerida';
  if (!requester) newErrors.requested_by = 'Indicá quién solicita';
  if (!description) newErrors.description = 'La descripción es requerida';
  if (!actionType) newErrors.action_type = 'Seleccioná un tipo de acción';
  if (!sectorType) newErrors.sector_type = 'Seleccioná un sector o equipo';
  if (sectorType === 'Otro' && sectorCustom.length === 0) {
    newErrors.sector_custom = 'Especificá el sector o equipo';
  }
  if (!workerId) newErrors.worker_id = 'Seleccioná un trabajador';
  if (!formData.group_id) newErrors.group_id = 'Seleccioná un grupo';
  if (costValue) {
    const { valid, error } = validateCost(costValue);
    if (!valid) newErrors.cost_spent = error;
  }
  if (chargeValue) {
    const { valid, error } = validateAmount(chargeValue);
    if (!valid) newErrors.amount_to_charge = error;
  }

  return {
    errors: newErrors,
    imageErrors: nextImageErrors,
    isValid: Object.keys(newErrors).length === 0 && nextImageErrors.every((error) => !error)
  };
};
