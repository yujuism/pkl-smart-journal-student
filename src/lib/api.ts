const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export type GoogleAuthResponse = {
  token: string | null
  user: { id: string; name: string; role: string; email: string; studentId: string | null } | null
  needsOnboarding: boolean
  googleData?: { email: string; name: string; picture?: string }
}

export type OnboardBody = {
  email: string
  name: string
  role: string
  phone?: string
  schoolId?: string
  nis?: string
  class?: string
  majorId?: string
}

export type Major = {
  id: string
  code: string
  name: string
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; name: string; role: string; email: string; studentId: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    google: (credential: string) =>
      request<GoogleAuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }),
    onboard: (body: OnboardBody) =>
      request<{ token: string | null; user: { id: string; name: string; role: string; email: string; studentId: string | null } | null; needsApproval?: boolean }>('/api/auth/google/onboard', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },
  majors: {
    list: () => request<Major[]>('/api/majors'),
  },
  journals: {
    list: (page = 1) => request<{ data: Journal[]; page: number }>(`/api/journals?page=${page}`),
    get: (id: string) => request<Journal>(`/api/journals/${id}`),
    create: (body: CreateJournalBody) =>
      request<Journal>('/api/journals', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Journal>) =>
      request<Journal>(`/api/journals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    compile: (id: string) =>
      request<Journal>(`/api/journals/${id}/compile`, { method: 'POST' }),
    finalize: (id: string) =>
      request<Journal>(`/api/journals/${id}/finalize`, { method: 'POST' }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/journals/${id}`, { method: 'DELETE' }),
    getByDate: (date: string) =>
      request<{ data: Journal[]; page: number }>(`/api/journals?page=1&limit=1`).then(r => r.data.find(j => j.date === date) ?? null),
  },
  placements: {
    my: () => request<Placement[]>('/api/placements/my'),
  },
}

export type Journal = {
  id: string
  date: string
  title: string
  activityRaw: string
  activityCompiled: string | null
  newThings: string | null
  obstacle: string | null
  solution: string | null
  rtl: string | null
  photoUrl: string | null
  aiProcessed: boolean
  createdAt: string
  updatedAt: string | null
  finalizedAt: string | null
  feedbacks?: Feedback[]
}

export type Feedback = {
  id: string
  content: string
  reviewerRole: string
  source: string
  createdAt: string
}

export type Placement = {
  id: string
  companyName: string
  companyAddress: string | null
  startDate: string | null
  endDate: string | null
  status: string
}

export type CreateJournalBody = {
  date: string
  title?: string
  activityRaw: string
  placementId?: string
  photoUrl?: string
}
