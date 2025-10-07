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
}

interface ScheduleItem {
  id: number;
  dayOfWeek: number;
  timeStart: string;
  timeEnd: string;
  room: string;
  subjectName: string;
}

const API_BASE = 'https://functions.poehali.dev';
const API = {
  auth: `${API_BASE}/21a8c9bd-9696-422c-b407-c5b6de9276ba`,
  students: `${API_BASE}/58887c14-07c7-474d-9010-85413635fec6`,
  grades: `${API_BASE}/89ea596d-9701-428a-84d6-09b2fcb5c858`,
  schedule: `${API_BASE}/e76355a4-a426-4e99-8617-c3396596eedf`,
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
  
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', password: 'student123' });
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.role === 'teacher') {
        loadStudents();
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
        setNewStudent({ firstName: '', lastName: '', email: '', password: 'student123' });
        loadStudents();
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить ученика', variant: 'destructive' });
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
          <Tabs defaultValue="students" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                <CardHeader>
                  <CardTitle>Журнал оценок</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Выберите ученика для просмотра и добавления оценок</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Расписание занятий</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Управление расписанием для классов</p>
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