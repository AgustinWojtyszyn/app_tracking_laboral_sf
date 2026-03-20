export const buildJobPayload = ({ formData, workerId, userId, jobToEdit, requestId }) => {
  const costValue = (formData.cost_spent ?? '').toString().trim();
  const chargeValue = (formData.amount_to_charge ?? '').toString().trim();
  const sectorCustomValue = (formData.sector_custom || '').toString().trim();

  const payload = {
    date: formData.date,
    title: formData.title?.trim() || null,
    location: formData.location || '',
    requested_by: formData.requested_by || '',
    description: formData.description || '',
    status: formData.status,
    editable_by_group: formData.editable_by_group,
    worker_id: workerId,
    group_id: formData.group_id || null,
    action_type: formData.action_type || null,
    sector_type: formData.sector_type || null,
    sector_custom: sectorCustomValue ? sectorCustomValue : null,
    cost_spent: costValue ? Number(costValue) : 0,
    amount_to_charge: chargeValue ? Number(chargeValue) : 0,
  };

  if (!jobToEdit) {
    payload.user_id = userId || null;
    payload.client_request_id = requestId || null;
  }

  return payload;
};
