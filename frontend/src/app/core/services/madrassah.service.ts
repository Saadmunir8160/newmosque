import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Student { id: number; name: string; gender?: string; }
export interface MadrassahClass {
  id: number; name: string; schedule?: string;
  enrolments?: { student: Student; status: string }[];
  sessions?: AttendanceSession[];
}
export interface AttendanceSession {
  id: number; classId: number; date: string; notes?: string;
  records?: { studentId: number; status: string }[];
}
export interface ParentChildView {
  student: Student;
  attendance: { status: string; count: number }[];
  fees: { amount: number; status: string; dueDate: string }[];
  progressNotes: { note: string; createdAt: string }[];
}
export interface MadrassahDashboard {
  totalStudents: number; totalClasses: number; attendanceRate: number; unpaidFees: number;
}

@Injectable({ providedIn: 'root' })
export class MadrassahService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/madrassah`;

  getClasses(): Observable<MadrassahClass[]> {
    return this.http.get<MadrassahClass[]>(`${this.base}/classes`);
  }

  getStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(`${this.base}/students`);
  }

  getDashboard(): Observable<MadrassahDashboard> {
    return this.http.get<MadrassahDashboard>(`${this.base}/dashboard`);
  }

  getMyChildren(): Observable<ParentChildView[]> {
    return this.http.get<ParentChildView[]>(`${this.base}/my-children`);
  }

  createSession(classId: number, date: string, notes?: string): Observable<AttendanceSession> {
    return this.http.post<AttendanceSession>(`${this.base}/classes/${classId}/sessions`, { date, notes });
  }

  recordAttendance(sessionId: number, records: { studentId: number; status: string }[]): Observable<unknown> {
    return this.http.post(`${this.base}/sessions/${sessionId}/attendance`, records);
  }

  addProgressNote(studentId: number, classId: number, note: string): Observable<unknown> {
    return this.http.post(`${this.base}/students/${studentId}/progress-notes`, { classId, note });
  }
}
