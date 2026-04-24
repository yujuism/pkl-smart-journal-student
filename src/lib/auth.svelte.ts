type AuthUser = {
  id: string
  name: string
  role: string
  email: string
  studentId: string | null
}

function createAuthStore() {
  let user = $state<AuthUser | null>(null)
  let token = $state<string | null>(null)
  let initialized = false

  function init() {
    if (initialized) return
    initialized = true
    const stored = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (stored && storedUser) {
      token = stored
      user = JSON.parse(storedUser) as AuthUser
    }
  }

  function login(t: string, u: AuthUser) {
    token = t
    user = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    token = null
    user = null
    initialized = false
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return {
    get user() { return user },
    get token() { return token },
    get isLoggedIn() { return !!token },
    init,
    login,
    logout,
  }
}

export const auth = createAuthStore()
