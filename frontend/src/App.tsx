import { useState } from 'react'
import './App.css'

function App() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!login || !password) {
      alert('Пожалуйста, заполните логин и пароль')
      return
    }

    alert(`Добро пожаловать, ${login}!`)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">Ж</div>

          <h1>Электронный журнал</h1>

          <p>
            Система управления учебным процессом
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login">Логин</label>

            <input
              id="login"
              type="text"
              placeholder="Введите логин"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>

            <input
              id="password"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit">
            Войти
          </button>
        </form>

        <div className="login-footer">
          Электронный журнал © 2026
        </div>
      </div>
    </main>
  )
}

export default App