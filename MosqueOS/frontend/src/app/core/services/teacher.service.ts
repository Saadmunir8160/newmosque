import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MadrassahClass, AttendanceSession, Student } from './madrassah.service';

export type ProgressType = 'Quran' | 'Memorization' | 'Exam' | 'TeacherNote';

export interface TeacherDashboard {
  totalClasses: number;
  totalStudents: number;
  attendanceRate: number;
  pendingGrades: number;
  recentActivity: { type: string; title: string; detail?: string; at: string }[];
}

export interface StudentProgressRecord {
  id: number;
  studentId: number;
  classId: number;
  progressType: ProgressType;
  title: string;
  detail?: string;
  surahOrTopic?: string;
  score?: number;
  recordDate?: string;
  createdAt: string;
}

export interface ProgressNote {
  id: number;
  note: string;
  createdAt: string;
}

export interface ClassAssignment {
  id: number;
  classId: number;
  title: string;
  description?: string;
  dueDate?: string;
  resourceUrl?: string;
  resourceFileName?: string;
  grades?: AssignmentGrade[];
}

export interface AssignmentGrade {
  id: number;
  assignmentId: number;
  studentId: number;
  grade?: string;
  feedback?: string;
  status: string;
  student?: Student;
}

export interface ClassReportRow {
  classId: number;
  className: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/teacher`;

  getDashboard(): Observable<TeacherDashboard> {
    return this.http.get<TeacherDashboard>(`${this.base}/dashboard`);
  }

  getClasses(search?: string): Observable<MadrassahClass[]> {
    const params = search?.trim() ? { search: search.trim() } : undefined;
    return this.http.get<MadrassahClass[]>(`${this.base}/classes`, { params });
  }

  getClass(classId: number): Observable<MadrassahClass> {
    return this.http.get<MadrassahClass>(`${this.base}/classes/${classId}`);
  }

  getStudents(classId: number, search?: string): Observable<Student[]> {
    const params = search?.trim() ? { search: search.trim() } : undefined;
    return this.http.get<Student[]>(`${this.base}/classes/${classId}/students`, { params });
  }

  getSessions(classId: number): Observable<AttendanceSession[]> {
    return this.http.get<AttendanceSession[]>(`${this.base}/classes/${classId}/sessions`);
  }

  createSession(classId: number, date: string, notes?: string): Observable<AttendanceSession> {
    return this.http.post<AttendanceSession>(`${this.base}/classes/${classId}/sessions`, { date, notes });
  }

  recordAttendance(sessionId: number, records: { studentId: number; status: string }[]): Observable<unknown> {
    return this.http.post(`${this.base}/sessions/${sessionId}/attendance`, records);
  }

  getProgress(studentId: number, classId: number, type?: ProgressType): Observable<{ records: StudentProgressRecord[]; notes: ProgressNote[] }> {
    const params: Record<string, string> = { classId: classId.toString() };
    if (type) params['type'] = type;
    return this.http.get<{ records: StudentProgressRecord[]; notes: ProgressNote[] }>(
      `${this.base}/students/${studentId}/progress`, { params }
    );
  }

  addProgress(studentId: number, body: {
    classId: number;
    progressType: ProgressType;
    title: string;
    detail?: string;
    surahOrTopic?: string;
    score?: number;
    recordDate?: string;
  }): Observable<StudentProgressRecord> {
    return this.http.post<StudentProgressRecord>(`${this.base}/students/${studentId}/progress`, body);
  }

  getAssignments(classId: number, search?: string): Observable<ClassAssignment[]> {
    const params = search?.trim() ? { search: search.trim() } : undefined;
    return this.http.get<ClassAssignment[]>(`${this.base}/classes/${classId}/assignments`, { params });
  }

  createAssignment(classId: number, body: {
    title: string;
    description?: string;
    dueDate?: string;
    resourceUrl?: string;
    resourceFileName?: string;
  }): Observable<ClassAssignment> {
    return this.http.post<ClassAssignment>(`${this.base}/classes/${classId}/assignments`, body);
  }

  gradeAssignment(assignmentId: number, studentId: number, body: { grade?: string; feedback?: string; status?: string }): Observable<AssignmentGrade> {
    return this.http.put<AssignmentGrade>(`${this.base}/assignments/${assignmentId}/grades/${studentId}`, body);
  }

  getReports(classId?: number): Observable<ClassReportRow[]> {
    const params = classId ? { classId: classId.toString() } : undefined;
    return this.http.get<ClassReportRow[]>(`${this.base}/reports`, { params });
  }
}
