import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react'
import '../styles/access.css'

export function LoginScreen({ onEnter }: { onEnter: (usuario: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const previous = document.title
    document.title = 'Ingresar | Orientación vocacional'
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <main className="ov-login theme-staff">
      <svg
        className="ov-login-landscape"
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        fill="none"
      >
        <circle cx="1180" cy="180" r="260" fill="#F2C66D" opacity=".18" />
        <circle cx="260" cy="820" r="320" fill="#1E3F38" opacity=".35" />
        <path
          d="M120 760C320 700 360 560 560 540S860 640 1040 520 1260 300 1380 260"
          stroke="#FFF4C8"
          strokeWidth="3"
          strokeDasharray="2 14"
          strokeLinecap="round"
          opacity=".55"
        />
        <g fill="#FFE29A">
          <circle cx="560" cy="540" r="6" />
          <circle cx="1040" cy="520" r="6" />
          <circle cx="1380" cy="260" r="6" />
        </g>
      </svg>
      <div className="ov-login-shell">
        <section className="ov-login-story" aria-label="Orientación vocacional">
          <div className="ov-login-brand">
            <span className="ov-login-brand-mark">
              <Compass size={25} aria-hidden="true" />
            </span>
            <div className="ov-login-brand-name">
              <span>Orientación</span>
              <strong>Explora</strong>
            </div>
            <Star className="ov-login-brand-star" size={18} fill="currentColor" aria-hidden="true" />
          </div>
          <div className="ov-login-story-copy">
            <h2>Orientación vocacional para estudiantes, familias y orientadores.</h2>
            <p>Cada uno tiene su propio espacio para acompañar el mismo camino.</p>
          </div>
          <ul className="ov-login-roles" aria-label="Para los tres perfiles">
            <li>
              <UserRound size={18} aria-hidden="true" /> Estudiantes
            </li>
            <li>
              <UsersRound size={18} aria-hidden="true" /> Familias
            </li>
            <li>
              <GraduationCap size={18} aria-hidden="true" /> Orientadores
            </li>
          </ul>
        </section>
        <section className="ov-login-access" aria-labelledby="ov-login-title">
          <div className="ov-login-intro">
            <h1 id="ov-login-title">Ingresa a la plataforma</h1>
            <p className="ov-login-description">Ingresa con el usuario y la contraseña de tu cuenta.</p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (username && password) onEnter(username)
            }}
          >
            <div className="ov-login-input-group">
              <label htmlFor="ov-login-username">Usuario</label>
              <div className="ov-login-field">
                <input
                  id="ov-login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Tu usuario"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            </div>
            <div className="ov-login-input-group">
              <label htmlFor="ov-login-password">Contraseña</label>
              <div className="ov-login-field">
                <input
                  id="ov-login-password"
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="ov-login-visibility"
                  type="button"
                  aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={visible}
                  aria-controls="ov-login-password"
                  onClick={() => setVisible((current) => !current)}
                >
                  {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
            </div>
            <button type="submit" className="ov-login-submit" data-ready={Boolean(username && password)}>
              Ingresar <ArrowRight size={20} aria-hidden="true" />
            </button>
          </form>
          <div className="ov-login-demo">
            <Info size={18} aria-hidden="true" />
            <p>
              <strong>Acceso de demostración.</strong> Puedes usar cualquier usuario y contraseña.
            </p>
          </div>
          <p className="ov-login-footer">¿No tienes tu usuario o lo olvidaste? Comunícate con tu colegio.</p>
        </section>
      </div>
    </main>
  )
}
