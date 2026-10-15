import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import jwt from 'jsonwebtoken'
import 'dotenv/config'
import bcrypt from 'bcryptjs'


const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('Не задан JWT_SECRET в файле .env')
}

app.use(cors());
app.use(express.json());

type AuthPayload = {
  id: number;
  role: string;
};

const authenticateToken = (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({
      error: "Требуется авторизация",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    res.locals.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: "Недействительный или просроченный токен",
    });
  }
};

const requireTeacher = (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) => {
  const user = res.locals.user as AuthPayload | undefined;

  if (!user || user.role !== "teacher") {
    res.status(403).json({
      error: "Доступ только для преподавателя",
    });
    return;
  }

  next();
};


app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Backend DiplomaJournal работает!",
  });
  });
  
  app.get("/api/test", (_req, res) => {
  res.json({
    message: "НОВЫЙ SERVER.TS РАБОТАЕТ!"
  });
});
app.get("/api/subjects", authenticateToken, async (_req, res) => {
  try {
    const defaultSubjects = [
      { name: "Веб-разработка", teacher: "Иванов И.И." },
      { name: "Базы данных", teacher: "Петрова А.В." },
      { name: "Программирование", teacher: "Сидоров Д.К." },
      { name: "Компьютерные сети", teacher: "Козлов М.В." },
    ];

    let subjects = await prisma.subject.findMany({
      orderBy: { id: "asc" },
    });

    if (subjects.length === 0) {
      for (const subject of defaultSubjects) {
        await prisma.subject.create({
          data: subject,
        });
      }

      subjects = await prisma.subject.findMany({
        orderBy: { id: "asc" },
      });
    }
console.log("Предметы и преподаватели:", subjects);

    res.json(subjects);
  } catch (error) {
    console.error("Ошибка получения предметов:", error);
    res.status(500).json({
      error: "Не удалось загрузить предметы",
    });
  }
});
  
app.get("/api/users", authenticateToken, requireTeacher, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        login: true,
        role: true,
        groupName: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Ошибка при получении пользователей",
    });
  }
});

console.log("МАРШРУТ LOGIN ЗАГРУЖЕН");

app.post("/api/users", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { name, login, password, role, groupName } = req.body;

    if (
      typeof name !== "string" ||
      typeof login !== "string" ||
      typeof password !== "string" ||
      !["teacher", "student"].includes(role)
    ) {
      return res.status(400).json({
        error: "Некорректные данные пользователя",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        login,
        password: hashedPassword,
        role,
        groupName,
      },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      groupName: user.groupName,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Ошибка при создании пользователя",
    });
  }
});


app.post("/api/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    if (typeof login !== "string" || typeof password !== "string") {
      return res.status(400).json({
        error: "Введите логин и пароль",
      });
    }

    const user = await prisma.user.findUnique({
      where: { login },
    });

    if (!user) {
      return res.status(401).json({
        error: "Неверный логин или пароль",
      });
    }

    // Проверяем, является ли сохранённый пароль хешем bcrypt.
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(user.password);

    let passwordIsValid = false;

    if (isBcryptHash) {
      passwordIsValid = await bcrypt.compare(password, user.password);
    } else {
      // Временная поддержка старых паролей в открытом виде.
      passwordIsValid = user.password === password;

      // После успешного входа преобразуем старый пароль в хеш.
      if (passwordIsValid) {
        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
      }
    }

    if (!passwordIsValid) {
      return res.status(401).json({
        error: "Неверный логин или пароль",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      id: user.id,
      name: user.name,
      login: user.login,
      role: user.role,
      groupName: user.groupName,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Ошибка при входе",
    });
  }
});

app.put("/api/users/:id", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { name, groupName } = req.body;

    const user = await prisma.user.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        name,
        groupName,
      },
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Ошибка при обновлении пользователя",
    });
  }
});

app.get("/api/attendance", authenticateToken, async (_req, res) => {
  try {
   const user = res.locals.user as AuthPayload;

const attendance = await prisma.attendance.findMany({
  where: user.role === "teacher"
    ? {}
    : { studentId: user.id },
  orderBy: { date: "desc" },
});

    res.json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Ошибка при получении посещаемости",
    });
  }
});


app.post("/api/attendance", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { studentId, subjectId, present, date } = req.body;

    if (
      !Number.isInteger(studentId) ||
      !Number.isInteger(subjectId) ||
      typeof present !== "boolean"
    ) {
      return res.status(400).json({
        error: "Некорректные данные посещаемости",
      });
    }

    const selectedDate = date ? new Date(date) : new Date();

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        error: "Некорректная дата",
      });
    }
    const student = await prisma.user.findUnique({
  where: { id: studentId },
  select: { id: true, role: true },
});

if (!student || student.role !== "student") {
  return res.status(400).json({
    error: "Ученик не найден",
  });
}

const subjectsInDb = await prisma.subject.findMany({
  select: {
    id: true,
    name: true,
  },
  orderBy: {
    id: "asc",
  },
});

console.log("Предметы в базе при сохранении оценки:", subjectsInDb);
console.log("Полученный subjectId:", subjectId);

const subject = subjectsInDb.find(
  (item) => item.id === subjectId
);

if (!subject) {
  return res.status(400).json({
    error: "Предмет не найден",
  });
}

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

  const existingRecords = await prisma.attendance.findMany({
  where: {
    studentId,
    subjectId,
    date: {
      gte: startOfDay,
      lt: endOfDay,
    },
  },
  orderBy: {
    id: "asc",
  },
});

let attendance;

if (existingRecords.length > 0 && existingRecords[0]) {
  attendance = await prisma.attendance.update({
    where: { id: existingRecords[0].id },
    data: {
      present,
      date: selectedDate,
    },
  });

  const duplicateIds = existingRecords
    .slice(1)
    .map((record) => record.id);

  if (duplicateIds.length > 0) {
    await prisma.attendance.deleteMany({
      where: {
        id: { in: duplicateIds },
      },
    });
  }
} else {
  attendance = await prisma.attendance.create({
    data: {
      studentId,
      subjectId,
      present,
      date: selectedDate,
    },
  });
}

res.status(existingRecords.length > 0 ? 200 : 201).json(attendance);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Не удалось сохранить посещаемость",
    });
  }
});


app.get(
  "/api/reports/monthly",
  authenticateToken,
  requireTeacher,
  async (req, res) => {
    try {
      const month = String(req.query.month ?? "");

      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({
          error: "Укажите месяц в формате YYYY-MM",
        });
      }

      const [yearText, monthText] = month.split("-");
      const year = Number(yearText);
      const monthNumber = Number(monthText);

      const startDate = new Date(
        Date.UTC(year, monthNumber - 1, 1)
      );

      const endDate = new Date(
        Date.UTC(year, monthNumber, 1)
      );

      const [students, grades, attendance, subjects] =
        await Promise.all([
         prisma.user.findMany({
  where: { role: "student" },
  select: {
    id: true,
    name: true,
    groupName: true,
  },
  orderBy: { name: "asc" },
}),
          prisma.grade.findMany({
            where: {
              date: {
                gte: startDate,
                lt: endDate,
              },
            },
          }),

          prisma.attendance.findMany({
            where: {
              date: {
                gte: startDate,
                lt: endDate,
              },
            },
          }),

          prisma.subject.findMany({
            select: {
              id: true,
              name: true,
            },
            orderBy: { name: "asc" },
          }),
        ]);

      const report = students.map((student) => {
        const studentGrades = grades.filter(
          (grade) => grade.studentId === student.id
        );

        const studentAttendance = attendance.filter(
          (record) => record.studentId === student.id
        );

        const averageGrade =
          studentGrades.length > 0
            ? Math.round(
                (studentGrades.reduce(
                  (sum, grade) => sum + grade.value,
                  0
                ) / studentGrades.length) * 100
              ) / 100
            : null;

        return {
          studentId: student.id,
          studentName: student.name,
          groupName: student.groupName,
          gradesCount: studentGrades.length,
          averageGrade,
          presentCount: studentAttendance.filter(
            (record) => record.present
          ).length,
          absentCount: studentAttendance.filter(
            (record) => !record.present
          ).length,
          subjects: subjects.map((subject) => {
            const subjectGrades = studentGrades.filter(
              (grade) => grade.subjectId === subject.id
            );

            const subjectAttendance = studentAttendance.filter(
              (record) => record.subjectId === subject.id
            );

            const subjectAverage =
              subjectGrades.length > 0
                ? Math.round(
                    (subjectGrades.reduce(
                      (sum, grade) => sum + grade.value,
                      0
                    ) / subjectGrades.length) * 100
                  ) / 100
                : null;

            return {
              subjectId: subject.id,
              subjectName: subject.name,
              grades: subjectGrades.map((grade) => ({
                value: grade.value,
                date: grade.date,
              })),
              averageGrade: subjectAverage,
              presentCount: subjectAttendance.filter(
                (record) => record.present
              ).length,
              absentCount: subjectAttendance.filter(
                (record) => !record.present
              ).length,
            };
          }),
        };
      });

      res.json({
        month,
        studentsCount: students.length,
        report,
      });
    } catch (error) {
      console.error(
        "Ошибка формирования месячной ведомости:",
        error
      );

      res.status(500).json({
        error: "Не удалось сформировать месячную ведомость",
      });
    }
  }
);



/* Получить все оценки из базы данных */
app.get("/api/grades", authenticateToken, async (_req, res) => {
  try {
   const user = res.locals.user as AuthPayload;

const grades = await prisma.grade.findMany({
  where: user.role === "teacher"
    ? {}
    : { studentId: user.id },
  orderBy: {
    date: "desc",
  },
});

    res.json(grades);
  } catch (error) {
    console.error("Ошибка загрузки оценок:", error);
    res.status(500).json({
      error: "Не удалось загрузить оценки",
    });
  }
});

/* Сохранить новую оценку в базу данных */
app.post("/api/grades", authenticateToken, requireTeacher, async (req, res) => {
  try {
    const { studentId, subjectId, value, date } = req.body;

    if (
      !Number.isInteger(studentId) ||
      studentId < 1 ||
      !Number.isInteger(subjectId) ||
      subjectId < 1 ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 10
    ) {
      res.status(400).json({
        error: "Оценка должна быть целым числом от 1 до 10",
      });
      return;
    }

   
const gradeDate = date ? new Date(date) : new Date();
if (Number.isNaN(gradeDate.getTime())) {
  return res.status(400).json({
    error: "Некорректная дата оценки",
  });
}

const dayStart = new Date(gradeDate);
dayStart.setHours(0, 0, 0, 0);

const nextDay = new Date(dayStart);
nextDay.setDate(nextDay.getDate() + 1);

const student = await prisma.user.findUnique({
  where: { id: studentId },
  select: { id: true, role: true },
});

if (!student || student.role !== "student") {
  return res.status(400).json({
    error: "Ученик не найден",
  });
}

const subject = await prisma.subject.findUnique({
  where: { id: subjectId },
  select: { id: true },
});

if (!subject) {
  return res.status(400).json({
    error: "Предмет не найден",
  });
}
const existingGrades = await prisma.grade.findMany({
  where: {
    studentId,
    subjectId,
    date: {
      gte: dayStart,
      lt: nextDay,
    },
  },
  orderBy: {
    id: "asc",
  },
});

let grade;

if (existingGrades.length > 0 && existingGrades[0]) {
  // Обновляем самую первую запись
  grade = await prisma.grade.update({
    where: {
      id: existingGrades[0].id,
    },
    data: {
      value,
      date: gradeDate,
    },
  });

  // Удаляем дубликаты этой оценки за тот же день
  const duplicateIds = existingGrades
    .slice(1)
    .map((item) => item.id);

  if (duplicateIds.length > 0) {
    await prisma.grade.deleteMany({
      where: {
        id: {
          in: duplicateIds,
        },
      },
    });
  }
} else {
  grade = await prisma.grade.create({
    data: {
      studentId,
      subjectId,
      value,
      date: gradeDate,
    },
  });
}

res.status(200).json(grade);
  } catch (error) {
    console.error("Ошибка сохранения оценки:", error);
    res.status(500).json({
      error: "Не удалось сохранить оценку",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend запущен: http://localhost:${PORT}`);
});

process.stdin.resume();