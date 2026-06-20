import client from './client'

export const getTasks = (params) =>
  client.get('/tasks', { params }).then((r) => r.data)

export const createTask = (data) =>
  client.post('/tasks', data).then((r) => r.data)

export const updateTask = (id, data) =>
  client.put(`/tasks/${id}`, data).then((r) => r.data)

export const updateTaskStatus = (id, status) =>
  client.patch(`/tasks/${id}/status`, { status }).then((r) => r.data)

export const deleteTask = (id) =>
  client.delete(`/tasks/${id}`)

export const deleteAllTasks = (projectId = null) =>
  client.delete('/tasks/all', { params: projectId ? { project_id: projectId } : {} })

export const bulkDeleteTasks = (ids) =>
  client.post('/tasks/bulk-delete', { ids })

export const bulkUpdateTasks = (ids, data) =>
  Promise.all(ids.map(id => client.put(`/tasks/${id}`, data)))
