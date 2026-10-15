
import { useEffect, useState, type FormEvent } from 'react'
import './App.css'


type Page =
  | 'home'
  | 'grades'
  | 'attendance'
  | 'report'
  | 'schedule'
  | 'messages'


type Role = 'student' | 'teacher'

type User = {
  id: number
  name: string
  login: string
  role: string
  groupName: string | null
  token: string
}

type AttendanceRecord = {
  id: number
  studentId: number
  subjectId: number
  present: boolean
  date: string
}

type SubjectRecord = {
  id: number
  name: string
  teacher: string
}

const teacher = {
  name: 'Иван Иванов',
  position: 'Преподаватель',
  department: 'Кафедра информационных технологий',
}

const subjects = [
  {
    name: 'Веб-разработка',
    teacher: 'Иванов И.И.',
    grade: 9,
    attendance: '92%',
  },
  {
    name: 'Базы данных',
    teacher: 'Петрова А.В.',
    grade: 8,
    attendance: '95%',
  },
  {
    name: 'Программирование',
    teacher: 'Сидоров Д.К.',
    grade: 9,
    attendance: '88%',
  },
  {
    name: 'Компьютерные сети',
    teacher: 'Козлов М.В.',
    grade: 7,
    attendance: '91%',
  },
]

const schedule = [
  {
    time: '09:00',
    subject: 'Веб-разработка',
    teacher: 'Иванов И.И.',
    room: 'Ауд. 204',
  },
  {
    time: '10:45',
    subject: 'Базы данных',
    teacher: 'Петрова А.В.',
    room: 'Ауд. 301',
  },
  {
    time: '13:00',
    subject: 'Программирование',
    teacher: 'Сидоров Д.К.',
    room: 'Комп. класс 2',
  },
]

function App() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const [dbSubjects, setDbSubjects] = useState<SubjectRecord[]>([])
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [grades, setGrades] = useState<Record<string, number>>({})

  const [gradesLoading, setGradesLoading] = useState(false)
  const [gradesError, setGradesError] = useState('')
  const [gradeSubjectId, setGradeSubjectId] = useState(1)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [gradeDate, setGradeDate] = useState(
    new Date().toISOString().slice(0, 10),
  )

  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceMonth, setAttendanceMonth] = useState(
    new Date().toISOString().slice(0, 7),
  )
  const [attendanceError, setAttendanceError] = useState('')

  const [page, setPage] = useState<Page>('home')
  const [role, setRole] = useState<Role>('student')
  const [users, setUsers] = useState<User[]>([])


const [reportMonth, setReportMonth] = useState(
  new Date().toISOString().slice(0, 7),
)
const [reportData, setReportData] = useState<any>(null)
const [reportLoading, setReportLoading] = useState(false)
const [reportError, setReportError] = useState('')

  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentLogin, setNewStudentLogin] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('')
  const [newStudentGroup, setNewStudentGroup] = useState('ИС-23')

  const [studentFormError, setStudentFormError] = useState('')
  const [studentFormMessage, setStudentFormMessage] = useState('')
  const [studentFormLoading, setStudentFormLoading] = useState(false)

  const students = users
    .filter((user) => user.role === 'student')
    .map((user) => ({
      id: user.id,
      name: user.name,
      group: user.groupName ?? 'Группа не указана',
    }))

console.log('Готовый список students:', students)

  const student = {
    name: currentUser?.name ?? 'Студент',
    group: currentUser?.groupName ?? 'Группа не указана',
    course: '3 курс',
    specialty: 'Информационные системы',
  }

  const getSubjectAverageGrade = (
    subjectId: number,
    studentId?: number,
  ) => {
    const values = Object.entries(grades)
      .filter(([key]) => {
        const [id, idSubject] = key.split('-').map(Number)

        return (
          idSubject === subjectId &&
          (studentId === undefined || id === studentId)
        )
      })
      .map(([, value]) => value)

    if (values.length === 0) return '—'

    const average =
      values.reduce((sum, value) => sum + value, 0) / values.length

    return average.toFixed(1)
  }

  const getAttendancePercent = (
    subjectId: number,
    studentId?: number,
  ) => {
    const records = Object.entries(attendance).filter(([key]) => {
      const [id, idSubject] = key.split('-').map(Number)

      return (
        idSubject === subjectId &&
        (studentId === undefined || id === studentId)
      )
    })

    if (records.length === 0) return '—'

    const presentCount = records.filter(([, present]) => present).length

    return `${Math.round((presentCount / records.length) * 100)}%`
  }

  const daysInMonth = new Date(
    Number(attendanceMonth.slice(0, 4)),
    Number(attendanceMonth.slice(5, 7)),
    0,
  ).getDate()

  const monthDates = Array.from(
    { length: daysInMonth },
    (_, index) => {
      const day = String(index + 1).padStart(2, '0')
      return `${attendanceMonth}-${day}`
    },
  )

  // Загружаем предметы после входа в систему.
  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      setDbSubjects([])
      return
    }

    fetch('http://localhost:5000/api/subjects', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить предметы')
        }

        return response.json()
      })
      .then((data: SubjectRecord[]) => {
        setDbSubjects(data)

        if (data.length > 0) {
          setGradeSubjectId((previousId) =>
            data.some((subject) => subject.id === previousId)
              ? previousId
              : data[0].id,
          )

          // Не сбрасываем выбранный предмет при обычном переходе
          // между страницами. Сбрасываем только несуществующий выбор.
          setSelectedSubjectId((previousId) =>
            previousId !== null &&
            data.some((subject) => subject.id === previousId)
              ? previousId
              : null,
          )
        } else {
          setSelectedSubjectId(null)
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки предметов:', error)
      })
  }, [isLoggedIn, authToken])

  // Загружаем пользователей для кабинета преподавателя.
  useEffect(() => {
    if (!isLoggedIn || !authToken || role !== 'teacher') {
      setUsers([])
      return
    }

    fetch('http://localhost:5000/api/users', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить пользователей')
        }

        return response.json()
      })
      .then((data: User[]) => {
  console.log('Пользователи с сервера:', data)
  setUsers(data)
})
      .catch((error) => {
        console.error('Ошибка загрузки пользователей:', error)
      })
  }, [isLoggedIn, authToken, role])

  // Загружаем посещаемость.
  useEffect(() => {
    if (!isLoggedIn || !authToken) return

    fetch('http://localhost:5000/api/attendance', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить посещаемость')
        }

        return response.json()
      })
      .then((records: AttendanceRecord[]) => {
        const saved: Record<string, boolean> = {}

        records.forEach((record) => {
          const date = record.date.slice(0, 10)
          const key = `${record.studentId}-${record.subjectId}-${date}`
          saved[key] = record.present
        })

        setAttendance(saved)
      })
      .catch((error) => {
        console.error('Ошибка загрузки посещаемости:', error)
        setAttendanceError('Не удалось загрузить отметки')
      })
  }, [isLoggedIn, authToken])

  // Загружаем оценки.
  useEffect(() => {
    if (!isLoggedIn || !authToken) return

    setGradesLoading(true)

    fetch('http://localhost:5000/api/grades', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Не удалось загрузить оценки')
        }

        return response.json()
      })
      .then((records: {
        id: number
        studentId: number
        subjectId: number
        value: number
        date: string
      }[]) => {
        const saved: Record<string, number> = {}

        records.forEach((record) => {
          const date = record.date.slice(0, 10)
          const key = `${record.studentId}-${record.subjectId}-${date}`
          saved[key] = record.value
        })

        setGrades(saved)
      })
      .catch((error) => {
        console.error('Ошибка загрузки оценок:', error)
        setGradesError('Не удалось загрузить оценки')
      })
      .finally(() => {
        setGradesLoading(false)
      })
  }, [isLoggedIn, authToken])

  const saveGradeForStudent = async (
    studentId: number,
    subjectId: number,
    value: number,
    date: string,
  ) => {
    if (!authToken) {
      setGradesError('Необходимо войти в систему заново.')
      return
    }

    setGradesError('')
    setGradesLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          studentId,
          subjectId,
          value,
          date,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)

        throw new Error(
          errorData?.error ?? 'Не удалось сохранить оценку',
        )
      }

      const savedGrade = await response.json()
      const key = `${savedGrade.studentId}-${savedGrade.subjectId}-${savedGrade.date.slice(0, 10)}`

      setGrades((previous) => ({
        ...previous,
        [key]: savedGrade.value,
      }))
    } catch (error) {
      console.error('Ошибка сохранения оценки:', error)
      setGradesError('Не удалось сохранить оценку. Проверь сервер.')
    } finally {
      setGradesLoading(false)
    }
  }

  const saveAttendance = async (
    studentId: number,
    present: boolean,
    date: string,
  ) => {
    if (!authToken) {
      setAttendanceError('Необходимо войти в систему заново.')
      return
    }

    if (dbSubjects.length === 0) {
      setAttendanceError('В базе данных нет предметов.')
      return
    }

    setAttendanceLoading(true)
    setAttendanceError('')

    try {
      const subjectId = dbSubjects[0].id

      const response = await fetch(
        'http://localhost:5000/api/attendance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            studentId,
            subjectId,
            present,
            date,
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)

        throw new Error(
          errorData?.error ?? 'Не удалось сохранить отметку',
        )
      }

      setAttendance((previous) => ({
        ...previous,
        [`${studentId}-${subjectId}-${date}`]: present,
      }))
    } catch (error) {
      console.error('Ошибка сохранения посещаемости:', error)

      setAttendanceError(
        error instanceof Error
          ? `Ошибка: ${error.message}`
          : 'Не удалось сохранить отметку.',
      )
    } finally {
      setAttendanceLoading(false)
    }
  }
  
  const loadMonthlyReport = async () => {
    if (!authToken) {
      setReportError('Необходимо войти в систему заново.')
      return
    }

    setReportLoading(true)
    setReportError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/reports/monthly?month=${reportMonth}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      )

      const data = await response.json()
      console.log(
  'Группы в месячной ведомости:',
  (data.report ?? []).map((student: any) => ({
    name: student.studentName,
    groupName: student.groupName,
  }))
)

      if (!response.ok) {
        throw new Error(
          data.error ?? 'Не удалось загрузить ведомость',
        )
      }

      const students = (data.report ?? []).map((student: any) => ({
  id: student.studentId,
  name: student.studentName,
  groupName: student.groupName ?? 'Группа не указана',
  gradeCount: student.gradesCount,
  averageGrade: student.averageGrade,
  presentCount: student.presentCount,
  absenceCount: student.absentCount,
}))
      const totalGrades = students.reduce(
        (sum: number, student: any) => sum + student.gradeCount,
        0,
      )

      const gradesWithAverage = students.filter(
        (student: any) => student.averageGrade !== null,
      )

      const averageGrade =
        gradesWithAverage.length > 0
          ? Math.round(
              (gradesWithAverage.reduce(
                (sum: number, student: any) =>
                  sum + student.averageGrade,
                0,
              ) /
                gradesWithAverage.length) *
                100,
            ) / 100
          : null

      const totalAbsences = students.reduce(
        (sum: number, student: any) => sum + student.absenceCount,
        0,
      )

      setReportData({
        summary: {
          studentCount: data.studentsCount ?? students.length,
          gradeCount: totalGrades,
          averageGrade,
          absenceCount: totalAbsences,
        },
        students,
      })
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : 'Ошибка загрузки ведомости',
      )
    } finally {
      setReportLoading(false)
    }
  }


  const handleLogin = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!login || !password) return

    try {
      const response = await fetch(
        'http://localhost:5000/api/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login,
            password,
          }),
        },
      )

      if (!response.ok) {
        alert('Неверный логин или пароль')
        return
      }

      const user: User = await response.json()
      console.log('Имя пользователя после входа:', user.name)

      setCurrentUser(user)
      setAuthToken(user.token)
      setRole(user.role as Role)
      setSelectedSubjectId(null)
      setPage('home')
      setIsLoggedIn(true)
    } catch (error) {
      console.error('Ошибка входа:', error)
      alert('Не удалось подключиться к серверу')
    }
  }

  

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    setAuthToken(null)
    setSelectedSubjectId(null)
    setPage('home')
    setLogin('')
    setPassword('')
    setGrades({})
    setAttendance({})
  }

  const handleAddStudent = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!authToken) {
      setStudentFormError('Необходимо войти в аккаунт преподавателя')
      return
    }

    const name = newStudentName.trim()
    const studentLogin = newStudentLogin.trim()
    const groupName = newStudentGroup.trim()

    if (!name || !studentLogin || !newStudentPassword || !groupName) {
      setStudentFormError('Заполни все поля')
      return
    }

    setStudentFormError('')
    setStudentFormMessage('')
    setStudentFormLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name,
          login: studentLogin,
          password: newStudentPassword,
          role: 'student',
          groupName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось добавить ученика')
      }

      const usersResponse = await fetch('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!usersResponse.ok) {
        throw new Error(
          'Ученик добавлен, но не удалось обновить список. Обнови страницу.',
        )
      }

      const updatedUsers: User[] = await usersResponse.json()
      setUsers(updatedUsers)

      setNewStudentName('')
      setNewStudentLogin('')
      setNewStudentPassword('')
      setNewStudentGroup('ИС-23')
      setStudentFormMessage('Ученик успешно добавлен')
    } catch (error) {
      setStudentFormError(
        error instanceof Error ? error.message : 'Произошла ошибка',
      )
    } finally {
      setStudentFormLoading(false)
    }
  }
  
  const pageTitles: Record<Page, string> = {
    home: 'Главная',
    grades: role === 'teacher' ? 'Оценки' : 'Мои оценки',
    attendance: 'Посещаемость',
    report: 'Месячная ведомость',
    schedule: 'Расписание',
    messages: 'Сообщения',
  }


  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="login-header">
<div className="logo">
  <img src="/bsac_logo.svg" alt="Логотип БГАС" />
</div>
            <h1>Электронный журнал</h1>
            <p>Система управления учебным процессом</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
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

            <button type="submit">Войти</button>
          </form>

          <div className="login-footer">
            Электронный журнал © 2026
          </div>
        </div>
      </main>
    )
  }

  // Кабинет преподавателя.
  if (role === 'teacher') {
    return (
      <div className="student-app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo small">
  <img src="/bsac_logo.svg" alt="Логотип БГАС" />
</div>
            <span>Электронный журнал</span>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${page === 'home' ? 'active' : ''}`}
              onClick={() => setPage('home')}
            >
              <span>⌂</span>
              Главная
            </button>

            <button
              className={`nav-item ${page === 'grades' ? 'active' : ''}`}
              onClick={() => setPage('grades')}
            >
              <span>▣</span>
              Оценки
            </button>

            <button
              className={`nav-item ${page === 'attendance' ? 'active' : ''}`}
              onClick={() => setPage('attendance')}
            >
              <span>◷</span>
              Посещаемость
            </button>
            
            <button
              className={`nav-item ${page === 'report' ? 'active' : ''}`}
              onClick={() => setPage('report')}
            >
              <span>▦</span>
              Месячная ведомость
            </button>

            <button
              className={`nav-item ${page === 'schedule' ? 'active' : ''}`}
              onClick={() => setPage('schedule')}
            >
              <span>▤</span>
              Расписание
            </button>

            <button
              className={`nav-item ${page === 'messages' ? 'active' : ''}`}
              onClick={() => setPage('messages')}
            >
              <span>✉️</span>
              Сообщения
            </button>
          </nav>

          <button className="logout-button" onClick={handleLogout}>
            ⇥ Выйти
          </button>
        </aside>

        <main className="student-main">
          <header className="topbar">
            <div>
              <h1>{pageTitles[page]}</h1>
              <p>Личный кабинет преподавателя</p>
            </div>

            <div className="student-mini-profile">
              <div className="avatar">ИИ</div>
              <div>
                <strong>{currentUser?.name ?? teacher.name}</strong>
                <span>{teacher.position}</span>
              </div>
            </div>
          </header>

          {page === 'home' && (
            <>
              <section className="dashboard-card add-student-card">
                <h2>Добавить ученика</h2>
                <p>Новый ученик появится в журнале после сохранения.</p>

                 <form onSubmit={handleAddStudent} className="add-student-form"> 
                  <div className="form-group">
                    <label htmlFor="newStudentName">ФИО ученика</label>
                    <input
                      id="newStudentName"
                      type="text"
                      value={newStudentName}
                      onChange={(event) =>
                        setNewStudentName(event.target.value)
                      }
                      placeholder="Например, Иван Иванов"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newStudentLogin">Логин</label>
                    <input
                      id="newStudentLogin"
                      type="text"
                      value={newStudentLogin}
                      onChange={(event) =>
                        setNewStudentLogin(event.target.value)
                      }
                      placeholder="Придумай логин"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newStudentPassword">Пароль</label>
                    <input
                      id="newStudentPassword"
                      type="password"
                      value={newStudentPassword}
                      onChange={(event) =>
                        setNewStudentPassword(event.target.value)
                      }
                      placeholder="Придумай пароль"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newStudentGroup">Группа</label>
                    <input
                      id="newStudentGroup"
                      type="text"
                      value={newStudentGroup}
                      onChange={(event) =>
                        setNewStudentGroup(event.target.value)
                      }
                      required
                    />
                  </div>

                  {studentFormError && (
                    <p role="alert">{studentFormError}</p>
                  )}

                  {studentFormMessage && <p>{studentFormMessage}</p>}

                  <button type="submit" disabled={studentFormLoading}>
                    {studentFormLoading
                      ? 'Сохранение...'
                      : 'Добавить ученика'}
                  </button>
                </form>
              </section>

              <section className="student-info">
                <div className="profile-card">
                  <div className="large-avatar">ИИ</div>
                  <div>
                    <h2>{currentUser?.name ?? teacher.name}</h2>
                    <p>{teacher.position}</p>
                    <div className="profile-details">
                      <span>
                        <strong>Кафедра:</strong>{' '}
                        Информационные технологии
                      </span>
                    </div>
                  </div>
                </div>

              <button
  type="button"
  className="stat-card stat-card-button"
  onClick={() => setPage('grades')}
  aria-label="Открыть оценки студентов"
>
                  <span className="stat-icon">👥</span>
                  <div>
                    <p>Студентов</p>
                    <strong>{students.length}</strong>
                  </div>
                </button>

               <button
  type="button"
  className="stat-card stat-card-button"
  onClick={() => setPage('attendance')}
  aria-label="Открыть раздел посещаемости студентов"
>
                  <span className="stat-icon">📚</span>
                  <div>
                    <p>Дисциплин</p>
                    <strong>{subjects.length}</strong>
                  </div>
                </button>
              </section>

              <section className="dashboard-grid">
                <div className="dashboard-card">
                  <div className="card-heading">
                    <div>
                      <h2>Журнал посещаемости</h2>
                      <p>Отметки студентов по дням месяца</p>
                    </div>
                  </div>

                  <div className="attendance-date">
                    <label htmlFor="attendanceMonth">
                      Месяц посещаемости:
                    </label>
                    <input
                      id="attendanceMonth"
                      type="month"
                      value={attendanceMonth}
                      onChange={(event) =>
                        setAttendanceMonth(event.target.value)
                      }
                    />
                  </div>

                  {attendanceError && (
                    <p role="alert">{attendanceError}</p>
                  )}

                  <p>✓ — присутствовал, ✗ — отсутствовал, — — нет отметки.</p>

                  <div className="subjects-list monthly-journal">
                    <table>
                      <thead>
                        <tr>
                          <th>Студент</th>
                          <th>Группа</th>
                          {monthDates.map((date) => (
                            <th key={date}>
                              {Number(date.slice(8, 10))}
                            </th>
                          ))}
                        </tr>
                      </thead>


                      <tbody>
                       {students.map((studentItem) => (
  <tr key={studentItem.id}>
    <td>{studentItem.name}</td>
  <td>{studentItem.group}</td>

                            {monthDates.map((date) => {
                              const key = `${studentItem.id}-${dbSubjects[0]?.id}-${date}`

                              return (
                                <td key={date}>
                                  <button
                                    type="button"
                                    className="attendance-cell"
                                    disabled={attendanceLoading}
                                    onClick={() => {
                                      const nextPresent =
                                        attendance[key] === undefined
                                          ? true
                                          : !attendance[key]

                                      void saveAttendance(
                                        studentItem.id,
                                        nextPresent,
                                        date,
                                      )
                                    }}
                                  >
                                    {attendance[key] === undefined
                                      ? '—'
                                      : attendance[key]
                                        ? '✓'
                                        : '✗'}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grade-entry">
                    <h2>Журнал оценок</h2>
                    <p>
                      Выбери предмет и дату, затем выставляй оценки
                      ученикам в таблице.
                    </p>

                    <label htmlFor="gradeSubject">Предмет:</label>
                    <select
                      id="gradeSubject"
                      value={gradeSubjectId}
                      onChange={(event) =>
                        setGradeSubjectId(Number(event.target.value))
                      }
                    >
                      {dbSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="gradeDate">Дата:</label>
                    <input
                      id="gradeDate"
                      type="date"
                      value={gradeDate}
                      onChange={(event) => setGradeDate(event.target.value)}
                    />

                    {gradesError && <p role="alert">{gradesError}</p>}

                    <div className="subjects-list monthly-journal">
                      <table>
                        <thead>
                          <tr>
                            <th>Ученик</th>
                            <th>Группа</th>
                            <th>Оценка</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((studentItem) => {
                            const key = `${studentItem.id}-${gradeSubjectId}-${gradeDate}`

                            return (
                              <tr key={studentItem.id}>
                                <td>{studentItem.name}</td>
                                <td>{studentItem.group}</td>
                                <td>
                                  <select
                                    aria-label={`Оценка: ${studentItem.name}`}
                                    value={grades[key] ?? ''}
                                    disabled={gradesLoading}
                                    onChange={(event) => {
                                      const value = Number(event.target.value)

                                      if (value >= 1 && value <= 10) {
                                        void saveGradeForStudent(
                                          studentItem.id,
                                          gradeSubjectId,
                                          value,
                                          gradeDate,
                                        )
                                      }
                                    }}
                                  >
                                    <option value="">—</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
                                      (value) => (
                                        <option key={value} value={value}>
                                          {value}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {gradesLoading && <p>Сохранение оценки...</p>}
                  </div>

                  {attendanceLoading && <p>Сохранение отметки...</p>}
                </div>

                <div className="dashboard-card">
                  <div className="card-heading">
                    <div>
                      <h2>Ближайшие занятия</h2>
                      <p>Сегодня</p>
                    </div>
                  </div>

                  <div className="schedule-list">
                    {schedule.map((lesson) => (
                      <div className="lesson" key={lesson.time}>
                        <div className="lesson-time">{lesson.time}</div>
                        <div className="lesson-info">
                          <strong>{lesson.subject}</strong>
                          <span>{lesson.room} · Группа ИС-23</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {page === 'grades' && (
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h2>Оценки студентов</h2>
                  <p>Управление успеваемостью</p>
                </div>
              </div>

              <div className="subjects-list">
                {dbSubjects.map((subject) => (
                  <div className="subject-row" key={subject.id}>
                    <div className="subject-info">
                      <strong>{subject.name}</strong>
                      <span>{subject.teacher}</span>
                    </div>
                    <div className="subject-attendance">
                      Средняя оценка
                    </div>
                    <div className="grade">
                      {getSubjectAverageGrade(subject.id)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {page === 'attendance' && (
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h2>Посещаемость</h2>
                  <p>Контроль посещаемости студентов</p>
                </div>
              </div>

              <div className="subjects-list">
                {dbSubjects.map((subject) => (
                  <div className="subject-row" key={subject.id}>
                    <div className="subject-info">
                      <strong>{subject.name}</strong>
                      <span>{subject.teacher}</span>
                    </div>
                    <div className="subject-attendance">
                      Посещаемость
                    </div>
                    <div className="grade">
                      {getAttendancePercent(subject.id)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {page === 'report' && (
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h2>Месячная ведомость</h2>
                  <p>Оценки и посещаемость студентов за месяц</p>
                </div>
              </div>

              <div className="report-controls">
                <label htmlFor="report-month">
                  Выбери месяц:
                </label>

                <input
                  id="report-month"
                  type="month"
                  value={reportMonth}
                  onChange={(event) => {
                    setReportMonth(event.target.value)
                    setReportData(null)
                    setReportError('')
                  }}
                />

                <button
                  type="button"
                  onClick={loadMonthlyReport}
                  disabled={reportLoading}
                >
                  {reportLoading
                    ? 'Загрузка...'
                    : 'Сформировать ведомость'}
                </button>
              </div>

              {reportError && (
                <p className="form-error">{reportError}</p>
              )}

              {reportData && (
                <>
                  <div className="report-summary">
                    <div className="stat-card">
                      <span>Студентов</span>
                      <strong>
                        {reportData.summary.studentCount}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Оценок</span>
                      <strong>
                        {reportData.summary.gradeCount}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Средний балл</span>
                      <strong>
                        {reportData.summary.averageGrade ?? '—'}
                      </strong>
                    </div>

                    <div className="stat-card">
                      <span>Пропусков</span>
                      <strong>
                        {reportData.summary.absenceCount}
                      </strong>
                    </div>
                  </div>

                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Студент</th>
                          <th>Группа</th>
                          <th>Оценок</th>
                          <th>Средний балл</th>
                          <th>Посещений</th>
                          <th>Пропусков</th>
                        </tr>
                      </thead>

                      <tbody>
                        {reportData.students.map((item: {
                          id: number
                          name: string
                          groupName: string | null
                          gradeCount: number
                          averageGrade: number | null
                          presentCount: number
                          absenceCount: number
                        }) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.groupName ?? '—'}</td>
                            <td>{item.gradeCount}</td>
                            <td>{item.averageGrade ?? '—'}</td>
                            <td>{item.presentCount}</td>
                            <td>{item.absenceCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}


          {page === 'schedule' && (
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h2>Расписание</h2>
                  <p>Расписание занятий преподавателя</p>
                </div>
              </div>

              <div className="schedule-list">
                {schedule.map((lesson) => (
                  <div className="lesson" key={lesson.time}>
                    <div className="lesson-time">{lesson.time}</div>
                    <div className="lesson-info">
                      <strong>{lesson.subject}</strong>
                      <span>{lesson.room} · Группа ИС-23</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {page === 'messages' && (
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h2>Сообщения</h2>
                  <p>Рабочие сообщения</p>
                </div>
              </div>

              <div className="announcement">
                <div className="announcement-date">
                  07
                  <span>ОКТ</span>
                </div>
                <div>
                  <strong>Учебная группа ИС-23</strong>
                  <p>
                    Напоминание о проведении контрольной работы
                    по веб-разработке.
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    )
  }

  // Кабинет студента.
  return (
    <div className="student-app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo small">
  <img src="/bsac_logo.svg" alt="Логотип БГАС" />
</div>
          <span>Электронный журнал</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${page === 'home' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            <span>⌂</span>
            Главная
          </button>

          <button
            className={`nav-item ${page === 'grades' ? 'active' : ''}`}
            onClick={() => setPage('grades')}
          >
            <span>▣</span>
            Мои оценки
          </button>

          <button
            className={`nav-item ${page === 'attendance' ? 'active' : ''}`}
            onClick={() => setPage('grades')}
          >
            <span>◷</span>
            Посещаемость
          </button>

          <button
            className={`nav-item ${page === 'schedule' ? 'active' : ''}`}
            onClick={() => setPage('schedule')}
          >
            <span>▤</span>
            Расписание
          </button>

          <button
            className={`nav-item ${page === 'messages' ? 'active' : ''}`}
            onClick={() => setPage('messages')}
          >
            <span>✉️</span>
            Сообщения
          </button>
        </nav>

        <button className="logout-button" onClick={handleLogout}>
          ⇥ Выйти
        </button>
      </aside>

      <main className="student-main">
        <header className="topbar">
          <div>
            <h1>{pageTitles[page]}</h1>
            <p>Личный кабинет студента</p>
          </div>

          <div className="student-mini-profile">
            <div className="avatar">АК</div>
            <div>
              <strong>{student.name}</strong>
              <span>{student.group}</span>
            </div>
          </div>
        </header>

        {page === 'home' && (
          <>
            <section className="student-info">
              <div className="profile-card">
                <div className="large-avatar">АК</div>
                <div>
                  <h2>{student.name}</h2>
                  <p>{student.specialty}</p>
                  <div className="profile-details">
                    <span>
                      <strong>Группа:</strong> {student.group}
                    </span>
                    <span>
                      <strong>Курс:</strong> {student.course}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">★</span>
                <div>
                  <p>Средний балл</p>
                  <strong>
                    {(() => {
                      const values = Object.entries(grades)
                        .filter(([key]) => {
                          const [studentId] = key.split('-').map(Number)
                          return studentId === currentUser?.id
                        })
                        .map(([, value]) => value)

                      return values.length
                        ? (
                            values.reduce((sum, value) => sum + value, 0) /
                            values.length
                          ).toFixed(1)
                        : '—'
                    })()}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">✓</span>
                <div>
                  <p>Посещаемость</p>
                  <strong>
                    {(() => {
                      const records = Object.entries(attendance).filter(
                        ([key]) => {
                          const [studentId] = key.split('-').map(Number)
                          return studentId === currentUser?.id
                        },
                      )

                      if (records.length === 0) return '—'

                      const presentCount = records.filter(
                        ([, present]) => present,
                      ).length

                      return `${Math.round(
                        (presentCount / records.length) * 100,
                      )}%`
                    })()}
                  </strong>
                </div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <h2>Мои дисциплины</h2>
                    <p>Текущая успеваемость</p>
                  </div>

                  <button
                    className="link-button"
                    onClick={() => {
                      setSelectedSubjectId(null)
                      setPage('grades')
                    }}
                  >
                    Все оценки →
                  </button>
                </div>

                <div className="subjects-list">
                  {dbSubjects.map((subject) => (
                    <div
                      className="subject-row"
                      key={subject.id}
                      onClick={() => setSelectedSubjectId(subject.id)}
                      style={{
                        cursor: 'pointer',
                        outline:
                          selectedSubjectId === subject.id
                            ? '2px solid var(--primary-color, #4f46e5)'
                            : undefined,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedSubjectId === subject.id}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedSubjectId(subject.id)
                        }
                      }}
                    >
                      <div className="subject-info">
                        <strong>{subject.name}</strong>
                        <span>{subject.teacher}</span>
                      </div>
                      <div className="subject-attendance">
                        {getAttendancePercent(subject.id, currentUser?.id)}
                      </div>
                      <div className="grade">
                        {getSubjectAverageGrade(subject.id, currentUser?.id)}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSubjectId !== null && (
                  <p>
                    Выбран предмет:{' '}
                    {dbSubjects.find(
                      (subject) => subject.id === selectedSubjectId,
                    )?.name ?? 'Предмет'}
                    {' · '}
                    <button
                      className="link-button"
                      onClick={() => setSelectedSubjectId(null)}
                    >
                      Сбросить выбор
                    </button>
                  </p>
                )}
              </div>

              <div className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <h2>Расписание</h2>
                    <p>Сегодня</p>
                  </div>
                  <button
                    className="link-button"
                    onClick={() => setPage('schedule')}
                  >
                    Все →
                  </button>
                </div>

                <div className="schedule-list">
                  {schedule.map((lesson) => (
                    <div className="lesson" key={lesson.time}>
                      <div className="lesson-time">{lesson.time}</div>
                      <div className="lesson-info">
                        <strong>{lesson.subject}</strong>
                        <span>
                          {lesson.teacher} · {lesson.room}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="dashboard-card announcements">
              <div className="card-heading">
                <div>
                  <h2>Объявления</h2>
                  <p>Последние сообщения учебного заведения</p>
                </div>
              </div>

              <div className="announcement">
                <div className="announcement-date">
                  07
                  <span>ОКТ</span>
                </div>
                <div>
                  <strong>Изменение расписания</strong>
                  <p>
                    В расписании на текущую неделю произошли изменения.
                    Проверьте актуальное расписание занятий.
                  </p>
                </div>
              </div>

              <div className="announcement">
                <div className="announcement-date">
                  05
                  <span>ОКТ</span>
                </div>
                <div>
                  <strong>Срок сдачи лабораторных работ</strong>
                  <p>
                    Не забудьте сдать лабораторные работы по дисциплине
                    «Базы данных».
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'grades' && (
          <section className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Мои оценки</h2>
                <p>Успеваемость по дисциплинам</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="studentGradeSubject">Предмет:</label>
              <select
                id="studentGradeSubject"
                value={selectedSubjectId ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setSelectedSubjectId(
                    value === '' ? null : Number(value),
                  )
                }}
              >
                <option value="">Все предметы</option>
                {dbSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subjects-list">
              {dbSubjects
                .filter(
                  (subject) =>
                    selectedSubjectId === null ||
                    subject.id === selectedSubjectId,
                )
                .map((subject) => (
                  <div className="subject-row" key={subject.id}>
                    <div className="subject-info">
                      <strong>{subject.name}</strong>
                      <span>{subject.teacher}</span>
                    </div>
                    <div className="subject-attendance">
                      Средняя оценка
                    </div>
                    <div className="grade">
                      {getSubjectAverageGrade(
                        subject.id,
                        currentUser?.id,
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {dbSubjects.length === 0 && (
              <p>Предметы не найдены. Проверь подключение к серверу.</p>
            )}
          </section>
        )}

        {page === 'attendance' && (
          <section className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Посещаемость</h2>
                <p>Посещаемость по дисциплинам</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="studentAttendanceSubject">Предмет:</label>
              <select
                id="studentAttendanceSubject"
                value={selectedSubjectId ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  setSelectedSubjectId(
                    value === '' ? null : Number(value),
                  )
                }}
              >
                <option value="">Все предметы</option>
                {dbSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="subjects-list">
              {dbSubjects
                .filter(
                  (subject) =>
                    selectedSubjectId === null ||
                    subject.id === selectedSubjectId,
                )
                .map((subject) => (
                  <div className="subject-row" key={subject.id}>
                    <div className="subject-info">
                      <strong>{subject.name}</strong>
                      <span>{subject.teacher}</span>
                    </div>
                    <div className="subject-attendance">
                      Посещаемость
                    </div>
                    <div className="grade">
                      {getAttendancePercent(
                        subject.id,
                        currentUser?.id,
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {dbSubjects.length === 0 && (
              <p>Предметы не найдены. Проверь подключение к серверу.</p>
            )}
          </section>
        )}

        {page === 'schedule' && (
          <section className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Расписание занятий</h2>
                <p>Расписание на сегодня</p>
              </div>
            </div>

            <div className="schedule-list">
              {schedule.map((lesson) => (
                <div className="lesson" key={lesson.time}>
                  <div className="lesson-time">{lesson.time}</div>
                  <div className="lesson-info">
                    <strong>{lesson.subject}</strong>
                    <span>
                      {lesson.teacher} · {lesson.room}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {page === 'messages' && (
          <section className="dashboard-card">
            <div className="card-heading">
              <div>
                <h2>Сообщения</h2>
                <p>Сообщения от преподавателей</p>
              </div>
            </div>

            <div className="announcement">
              <div className="announcement-date">
                07
                <span>ОКТ</span>
              </div>
              <div>
                <strong>Иванов И.И.</strong>
                <p>
                  Не забудьте подготовить лабораторную работу
                  по веб-разработке.
                </p>
              </div>
            </div>

            <div className="announcement">
              <div className="announcement-date">
                05
                <span>ОКТ</span>
              </div>
              <div>
                <strong>Петрова А.В.</strong>
                <p>
                  Напоминаю о сроке сдачи лабораторной работы
                  по базам данных.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
