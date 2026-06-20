import client from './client'

export const getTimeEntries = (params) =>
  client.get('/time-entries', { params }).then((r) => r.data)

export const createTimeEntry = (data) =>
  client.post('/time-entries', data).then((r) => r.data)

export const updateTimeEntry = (id, data) =>
  client.put(`/time-entries/${id}`, data).then((r) => r.data)

export const deleteTimeEntry = (id) =>
  client.delete(`/time-entries/${id}`)
