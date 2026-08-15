import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react'

interface Props {
  /** Returns false when the credentials don't match. */
  onSubmit: (username: string, password: string) => boolean
}

export default function LoginScreen({ onSubmit }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter both a username and a password.')
      return
    }
    if (!onSubmit(username, password)) {
      setError('Incorrect username or password.')
      setPassword('')
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-mark">P</div>
          <div className="brand-text">
            <b>Pre-Prod</b>
            <span>Garment Manufacturing</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="login-sub">Enter your credentials to open the dashboard.</p>

        <div className="field">
          <label htmlFor="login-user">Username</label>
          <input
            id="login-user"
            className="input"
            value={username}
            autoFocus
            autoComplete="username"
            spellCheck={false}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="login-pass">Password</label>
          <div className="login-pass">
            <input
              id="login-pass"
              className="input"
              type={reveal ? 'text' : 'password'}
              value={password}
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
            />
            <button
              type="button"
              className="btn icon-btn btn-ghost btn-sm"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? 'Hide password' : 'Show password'}
              title={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="login-error">
            <ShieldAlert size={15} />
            {error}
          </p>
        )}

        <button className="btn btn-primary login-submit" type="submit">
          <LogIn size={16} />
          Sign in
        </button>
      </form>
    </div>
  )
}
