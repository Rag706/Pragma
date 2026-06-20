import client from './client'

export const getTaskLogs   = (taskId)       => client.get(`/tasks/${taskId}/logs`).then(r => r.data)
export const createTaskLog = (taskId, body) => client.post(`/tasks/${taskId}/logs`, body).then(r => r.data)
export const deleteTaskLog = (logId)        => client.delete(`/logs/${logId}`)
