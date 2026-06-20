import client from './client'

export const getProjectTags = (projectId) =>
  client.get(`/projects/${projectId}/tags`).then(r => r.data)

export const createTag = (projectId, data) =>
  client.post(`/projects/${projectId}/tags`, data).then(r => r.data)

export const updateTag = (id, data) =>
  client.put(`/tags/${id}`, data).then(r => r.data)

export const deleteTag = (id) =>
  client.delete(`/tags/${id}`)

export const setTaskTags = (taskId, tagIds) =>
  client.put(`/tasks/${taskId}/tags`, { tag_ids: tagIds }).then(r => r.data)
