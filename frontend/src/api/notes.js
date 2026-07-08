import client from './client'

export const getProjectNotes = (projectId) =>
  client.get(`/projects/${projectId}/notes`).then(r => r.data)

export const createNote = (projectId, data) =>
  client.post(`/projects/${projectId}/notes`, data).then(r => r.data)

export const updateNote = (noteId, data) =>
  client.put(`/notes/${noteId}`, data).then(r => r.data)

export const deleteNote = (noteId) =>
  client.delete(`/notes/${noteId}`)

export const reorderNotes = (projectId, ids) =>
  client.put(`/projects/${projectId}/notes/reorder`, { ids })
