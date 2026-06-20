import client from './client'

export const getChecklist        = (taskId)       => client.get(`/tasks/${taskId}/checklist`).then(r => r.data)
export const createChecklistItem = (taskId, data) => client.post(`/tasks/${taskId}/checklist`, data).then(r => r.data)
export const updateChecklistItem = (id, data)     => client.patch(`/checklist/${id}`, data).then(r => r.data)
export const deleteChecklistItem = (id)           => client.delete(`/checklist/${id}`)
