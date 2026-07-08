import client from './client'

export const getProjectLogs = (projectId) =>
  client.get(`/projects/${projectId}/logs`).then(r => r.data)

export const createProjectLog = (projectId, data) =>
  client.post(`/projects/${projectId}/logs`, data).then(r => r.data)

export const deleteProjectLog = (logId) =>
  client.delete(`/project_logs/${logId}`)
