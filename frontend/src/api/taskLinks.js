import client from './client'

export const getTaskLinks   = (taskId)       => client.get(`/tasks/${taskId}/links`).then(r => r.data)
export const createTaskLink = (taskId, data) => client.post(`/tasks/${taskId}/links`, data).then(r => r.data)
export const updateTaskLink = (id, data)     => client.put(`/links/${id}`, data).then(r => r.data)
export const deleteTaskLink = (id)           => client.delete(`/links/${id}`)
