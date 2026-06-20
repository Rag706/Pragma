import client from './client'

export const getProjectReferences = (projectId) =>
  client.get(`/projects/${projectId}/references`).then(r => r.data)

export const createReference = (projectId, data) =>
  client.post(`/projects/${projectId}/references`, data).then(r => r.data)

export const updateReference = (id, data) =>
  client.put(`/references/${id}`, data).then(r => r.data)

export const deleteReference = (id) =>
  client.delete(`/references/${id}`)
