import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from '@/hooks/use-toast';

interface User {
  id: number;
  email: string;
  role: 'teacher' | 'student';
  firstName: string;
  lastName: string;
}

interface Student {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface Grade {
  id: number;
  grade: number;
  date: string;
  comment: string;
  subjectName: string;
  studentName?: string;
}

interface ScheduleItem {
  id: number;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  room: string;
  subjectName: string;
}

interface Class {
  id: number;
  name: string;
  teacherId: number;
  teacherFirstName: string;
  teacherLastName: string;
  studentCount: number;
}

const API_BASE = 'https://functions.poehali.dev';
const API = {
  auth: `${API_BASE}/21a8c9bd-9696-422c-b407-c5b6de9276ba`,
  students: `${API_BASE}/58887c14-07c7-474d-9010-85413635fec6`,
  grades: `${API_BASE}/89ea596d-9701-428a-84d6-09b2fcb5c858`,
  schedule: `${API_BASE}/e76355a4-a426-4e99-8617-c3396596eedf`,
  classes: `${API_BASE}/19601f1c-fd62-4bd0-b8c4-3509f8967a57`,
};

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [averageGrade, setAverageGrade] = useState<number>(0);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', password: 'student123', classId: '' });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newClass, setNewClass] = useState({ name: '' });
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [newGrade, setNewGrade] = useState({ grade: 5, comment: '', subject: '' });
  const [isAddGradeOpen, setIsAddGradeOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ dayOfWeek: 1, timeStart: '09:00', timeEnd: '09:45', room: '', subject: '' });
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.role === 'teacher') {
        loadStudents();
        loadClasses();
      } else {
        loadStudentData(parsedUser.id);
      }
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(API.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        toast({ title: 'Успешный вход', description: `Добро пожаловать, ${userData.firstName}!` });
        
        if (userData.role === 'teacher') {
          loadStudents();
          loadClasses();
        } else {
          loadStudentData(userData.id);
        }
      } else {
        const error = await response.json();
        toast({ title: 'Ошибка входа', description: error.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setEmail('');
    setPassword('');
    setStudents([]);
    setGrades([]);
    setSchedule([]);
  };

  const loadStudents = async () => {
    try {
      const response = await fetch(API.students);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const loadStudentData = async (studentId: number) => {
    try {
      const gradesResponse = await fetch(`${API.grades}?studentId=${studentId}`);
      if (gradesResponse.ok) {
        const gradesData = await gradesResponse.json();
        setGrades(gradesData.grades);
        setAverageGrade(gradesData.averageGrade);
      }
    } catch (error) {
      console.error('Failed to load student data:', error);
    }
  };

  const loadAllGrades = async () => {
    try {
      const allGradesData: Grade[] = [];
      for (const student of students) {
        const response = await fetch(`${API.grades}?studentId=${student.id}`);
        if (response.ok) {
          const data = await response.json();
          allGradesData.push(...data.grades.map((g: Grade) => ({
            ...g,
            studentName: `${student.firstName} ${student.lastName}`
          })));
        }
      }
      setGrades(allGradesData);
    } catch (error) {
      console.error('Failed to load all grades:', error);
    }
  };

  const loadClassSchedule = async (classId: number) => {
    try {
      const response = await fetch(`${API.schedule}?classId=${classId}`);
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
      }
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
  };

  const loadClasses = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API.classes}?teacherId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const handleAddClass = async () => {
    if (!user) return;
    try {
      const response = await fetch(API.classes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClass.name, teacherId: user.id }),
      });
      
      if (response.ok) {
        toast({ title: 'Класс создан', description: 'Новый класс успешно добавлен' });
        setIsAddClassOpen(false);
        setNewClass({ name: '' });
        loadClasses();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать класс', variant: 'destructive' });
    }
  };

  const handleDeleteClass = async (classId: number) => {
    try {
      const response = await fetch(`${API.classes}?id=${classId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({ title: 'Класс удален', description: 'Класс успешно удален' });
        loadClasses();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить класс', variant: 'destructive' });
    }
  };

  const handleAddStudent = async () => {
    try {
      const response = await fetch(API.students, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      
      if (response.ok) {
        toast({ title: 'Ученик добавлен', description: 'Новый ученик успешно создан' });
        setIsAddStudentOpen(false);
        setNewStudent({ firstName: '', lastName: '', email: '', password: 'student123', classId: '' });
        loadStudents();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить ученика', variant: 'destructive' });
    }
  };

  const handleDeleteStudent = async (studentId: number) => {
    try {
      const response = await fetch(`${API.students}?id=${studentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({ title: 'Ученик удален', description: 'Ученик успешно удален' });
        loadStudents();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось удалить ученика', variant: 'destructive' });
    }
  };

  const handleAddGrade = async () => {
    if (!selectedStudent) return;
    try {
      const response = await fetch(API.grades, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          subjectId: 1,
          grade: newGrade.grade,
          comment: newGrade.comment,
          date: new Date().toISOString().split('T')[0]
        }),
      });
      
      if (response.ok) {
        toast({ title: 'Оценка добавлена', description: 'Оценка успешно выставлена' });
        setIsAddGradeOpen(false);
        setNewGrade({ grade: 5, comment: '', subject: '' });
        setSelectedStudent(null);
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить оценку', variant: 'destructive' });
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedClass) return;
    try {
      const response = await fetch(API.schedule, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: 1,
          dayOfWeek: newSchedule.dayOfWeek,
          timeStart: newSchedule.timeStart,
          timeEnd: newSchedule.timeEnd,
          room: newSchedule.room
        }),
      });
      
      if (response.ok) {
        toast({ title: 'Расписание добавлено', description: 'Урок успешно добавлен в расписание' });
        setIsAddScheduleOpen(false);
        setNewSchedule({ dayOfWeek: 1, timeStart: '09:00', timeEnd: '09:45', room: '', subject: '' });
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить расписание', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center border-b bg-primary text-primary-foreground">
            <CardTitle className="text-2xl font-serif">Электронный Журнал Веб</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ваш@email.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Войти'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === 'teacher') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <header className="bg-primary text-primary-foreground shadow-md">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-serif">Электронный Журнал Веб</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm">
                <Icon name="User" size={16} className="inline mr-1" />
                {user.firstName} {user.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="bg-white text-primary hover:bg-gray-100">
                Выйти
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="classes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl">
              <TabsTrigger value="classes">
                <Icon name="School" size={18} className="mr-2" />
                Классы
              </TabsTrigger>
              <TabsTrigger value="students">
                <Icon name="Users" size={18} className="mr-2" />
                Ученики
              </TabsTrigger>
              <TabsTrigger value="grades">
                <Icon name="BookOpen" size={18} className="mr-2" />
                Оценки
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Icon name="Calendar" size={18} className="mr-2" />
                Расписание
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Классы</CardTitle>
                  <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Icon name="Plus" size={18} className="mr-2" />
                        Создать класс
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Новый класс</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Название класса</Label>
                          <Input
                            placeholder="Например: 10А"
                            value={newClass.name}
                            onChange={(e) => setNewClass({ name: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddClass} className="w-full">
                          Создать
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.length === 0 ? (
                      <p className="text-muted-foreground col-span-full text-center py-8">
                        Нет классов
                      </p>
                    ) : (
                      classes.map((cls) => (
                        <Card key={cls.id} className="hover:shadow-md transition-shadow">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{cls.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClass(cls.id)}
                              >
                                <Icon name="Trash2" size={18} className="text-destructive" />
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-muted-foreground">
                              <p>Учеников: {cls.studentCount}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Список учеников</CardTitle>
                  <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Icon name="UserPlus" size={18} className="mr-2" />
                        Добавить ученика
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Новый ученик</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Имя</Label>
                          <Input
                            value={newStudent.firstName}
                            onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Фамилия</Label>
                          <Input
                            value={newStudent.lastName}
                            onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newStudent.email}
                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Пароль</Label>
                          <Input
                            value={newStudent.password}
                            onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddStudent} className="w-full">
                          Создать профиль
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Имя</TableHead>
                        <TableHead>Фамилия</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Нет учеников
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.id}</TableCell>
                            <TableCell>{student.firstName}</TableCell>
                            <TableCell>{student.lastName}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteStudent(student.id)}
                              >
                                <Icon name="Trash2" size={16} className="text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grades" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Журнал оценок</CardTitle>
                  <Dialog open={isAddGradeOpen} onOpenChange={setIsAddGradeOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Icon name="Plus" size={18} className="mr-2" />
                        Выставить оценку
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Выставить оценку</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Ученик</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={selectedStudent || ''}
                            onChange={(e) => setSelectedStudent(Number(e.target.value))}
                          >
                            <option value="">Выберите ученика</option>
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Предмет</Label>
                          <Input
                            placeholder="Математика"
                            value={newGrade.subject}
                            onChange={(e) => setNewGrade({ ...newGrade, subject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Оценка</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={newGrade.grade}
                            onChange={(e) => setNewGrade({ ...newGrade, grade: Number(e.target.value) })}
                          >
                            <option value={5}>5 (Отлично)</option>
                            <option value={4}>4 (Хорошо)</option>
                            <option value={3}>3 (Удовлетворительно)</option>
                            <option value={2}>2 (Неудовлетворительно)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Комментарий (необязательно)</Label>
                          <Input
                            value={newGrade.comment}
                            onChange={(e) => setNewGrade({ ...newGrade, comment: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddGrade} className="w-full" disabled={!selectedStudent}>
                          Выставить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Button onClick={loadAllGrades} variant="outline">
                      <Icon name="RefreshCw" size={18} className="mr-2" />
                      Загрузить все оценки
                    </Button>
                  </div>
                  {grades.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Нет оценок. Нажмите "Загрузить все оценки"</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ученик</TableHead>
                          <TableHead>Предмет</TableHead>
                          <TableHead>Оценка</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Комментарий</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grades.map((grade) => (
                          <TableRow key={grade.id}>
                            <TableCell>{grade.studentName || '—'}</TableCell>
                            <TableCell>{grade.subjectName}</TableCell>
                            <TableCell>
                              <span className={`font-bold ${
                                grade.grade >= 4 ? 'text-green-600' : grade.grade === 3 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {grade.grade}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(grade.date).toLocaleDateString('ru-RU')}</TableCell>
                            <TableCell className="text-muted-foreground">{grade.comment || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Расписание занятий</CardTitle>
                  <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Icon name="Plus" size={18} className="mr-2" />
                        Добавить урок
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить урок в расписание</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Класс</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={selectedClass || ''}
                            onChange={(e) => setSelectedClass(Number(e.target.value))}
                          >
                            <option value="">Выберите класс</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Предмет</Label>
                          <Input
                            placeholder="Математика"
                            value={newSchedule.subject}
                            onChange={(e) => setNewSchedule({ ...newSchedule, subject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>День недели</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={newSchedule.dayOfWeek}
                            onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })}
                          >
                            {DAYS.map((day, index) => (
                              <option key={index} value={index + 1}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Начало</Label>
                            <Input
                              type="time"
                              value={newSchedule.timeStart}
                              onChange={(e) => setNewSchedule({ ...newSchedule, timeStart: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Конец</Label>
                            <Input
                              type="time"
                              value={newSchedule.timeEnd}
                              onChange={(e) => setNewSchedule({ ...newSchedule, timeEnd: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Кабинет</Label>
                          <Input
                            placeholder="201"
                            value={newSchedule.room}
                            onChange={(e) => setNewSchedule({ ...newSchedule, room: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddSchedule} className="w-full" disabled={!selectedClass}>
                          Добавить
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2">
                    <Label>Выберите класс для просмотра расписания</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      onChange={(e) => {
                        const classId = Number(e.target.value);
                        if (classId) loadClassSchedule(classId);
                      }}
                    >
                      <option value="">Выберите класс</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {schedule.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Выберите класс для просмотра расписания</p>
                  ) : (
                    <div className="space-y-4">
                      {DAYS.map((day, dayIndex) => {
                        const daySchedule = schedule.filter(s => s.dayOfWeek === dayIndex + 1);
                        if (daySchedule.length === 0) return null;
                        return (
                          <Card key={dayIndex}>
                            <CardHeader>
                              <CardTitle className="text-lg">{day}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {daySchedule.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-md bg-secondary/10">
                                    <div>
                                      <div className="font-medium">{item.subjectName}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Кабинет: {item.room || '—'}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                      {item.timeStart} - {item.timeEnd}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-serif">Электронный Журнал Веб</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              <Icon name="User" size={16} className="inline mr-1" />
              {user.firstName} {user.lastName}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="bg-white text-primary hover:bg-gray-100">
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-secondary text-secondary-foreground">
              <CardTitle className="flex items-center">
                <Icon name="Award" size={24} className="mr-2" />
                Средний балл
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {averageGrade.toFixed(2)}
                </div>
                <p className="text-muted-foreground">из 5.00</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-secondary text-secondary-foreground">
              <CardTitle className="flex items-center">
                <Icon name="Calendar" size={24} className="mr-2" />
                Расписание на неделю
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {schedule.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Расписание пока не добавлено</p>
              ) : (
                <div className="space-y-2">
                  {schedule.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 border-b">
                      <div>
                        <div className="font-medium">{DAYS[item.dayOfWeek - 1]}</div>
                        <div className="text-sm text-muted-foreground">{item.subjectName}</div>
                      </div>
                      <div className="text-sm">
                        {item.timeStart} - {item.timeEnd}
                        {item.room && ` • ${item.room}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="bg-secondary text-secondary-foreground">
            <CardTitle className="flex items-center">
              <Icon name="BookOpen" size={24} className="mr-2" />
              Последние оценки
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {grades.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Оценок пока нет</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Оценка</TableHead>
                    <TableHead>Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.slice(0, 10).map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>{new Date(grade.date).toLocaleDateString('ru-RU')}</TableCell>
                      <TableCell>{grade.subjectName}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${
                          grade.grade >= 4 ? 'text-green-600' : grade.grade === 3 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {grade.grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{grade.comment || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}