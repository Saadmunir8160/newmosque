import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { AuthWelcomeComponent } from './modules/auth/auth-welcome/auth-welcome.component';
import { LoginComponent } from './modules/auth/login/login.component';
import { AuthCallbackComponent } from './modules/auth/auth-callback/auth-callback.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { TodayComponent } from './modules/home/today/today.component';
import { LandingComponent } from './modules/home/landing/landing.component';
import { DemoMosqueComponent } from './modules/home/demo-mosque/demo-mosque.component';
import { PrayerTimesComponent } from './modules/prayer-times/prayer-times.component';
import { AnnouncementsComponent } from './modules/announcements/announcements.component';
import { EventsComponent } from './modules/events/events.component';
import { authGuard, dashboardGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ROLES } from './core/constants/roles';

// Super Admin
import { SuperDashboardComponent } from './modules/super/dashboard/super-dashboard.component';
import { SuperMosquesComponent } from './modules/super/mosques/super-mosques.component';
import { SuperClaimsComponent } from './modules/super/claims/super-claims.component';
import { SuperUsersComponent } from './modules/super/users/super-users.component';
import { SuperMosqueDataComponent } from './modules/super/mosque-data/super-mosque-data.component';
import { SuperFeaturesComponent } from './modules/super/features/super-features.component';
import { SuperAuditComponent } from './modules/super/audit/super-audit.component';
import { SuperSettingsComponent } from './modules/super/settings/super-settings.component';
import { SuperReportsComponent } from './modules/super/reports/super-reports.component';
// Mosque Owner
import { OwnerDashboardComponent } from './modules/owner/dashboard/owner-dashboard.component';
import { OwnerClaimComponent } from './modules/owner/claim/owner-claim.component';
import { OwnerStaffComponent } from './modules/owner/staff/owner-staff.component';
// Mosque Admin
import { AdminMosqueComponent } from './modules/admin/mosque-profile/admin-mosque.component';
import { AdminPrayerTimesComponent } from './modules/admin/prayer-times-edit/admin-prayer-times.component';
import { AdminAnnouncementsComponent } from './modules/admin/announcements-manage/admin-announcements.component';
import { AdminEventsComponent } from './modules/admin/events-manage/admin-events.component';
import { AdminJanazaComponent } from './modules/admin/janaza/admin-janaza.component';
import { AdminSettingsComponent } from './modules/admin/settings/admin-settings.component';
import { AdminCommunitiesComponent } from './modules/admin/communities/admin-communities.component';
import { AdminParticipationComponent } from './modules/admin/participation/admin-participation.component';
import { AdminMadrassahComponent } from './modules/admin/madrassah/admin-madrassah.component';
// Teacher
import { TeacherDashboardComponent } from './modules/teacher/teacher-dashboard.component';
import { TeacherClassesComponent } from './modules/teacher/teacher-classes.component';
import { TeacherAttendanceComponent } from './modules/teacher/teacher-attendance.component';
// Muqaddam
import { MuqaddamComponent } from './modules/muqaddam/muqaddam.component';
import { MuqaddamReadingsComponent } from './modules/muqaddam/muqaddam-readings.component';
// Content Editor
import { ContentAwradComponent } from './modules/content/content-awrad.component';
import { ContentDuasComponent } from './modules/content/content-duas.component';
import { ContentAdhkarComponent } from './modules/content/content-adhkar.component';
import { ContentRitualGuidesComponent } from './modules/content/content-ritual-guides.component';
// Parent
import { ParentPortalComponent } from './modules/parent/parent-portal.component';
// Member spiritual
import { MemberWirdComponent } from './modules/member/member-wird.component';
import { MemberAdhkarComponent } from './modules/member/member-adhkar.component';
import { MemberQuranComponent } from './modules/member/member-quran.component';
import { MemberDuasComponent } from './modules/member/member-duas.component';
import { MemberCommunitiesComponent } from './modules/member/member-communities.component';
import { MemberPreferencesComponent } from './modules/member/member-preferences.component';
import { MemberReadingsComponent } from './modules/member/member-readings.component';

const adminRoles = [ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];
const prayerRoles = [ROLES.SuperAdmin, ROLES.MosqueAdmin, ROLES.PrayerTimesEditor];
const teacherRoles = [ROLES.Teacher, ...adminRoles];
const contentRoles = [...adminRoles, ROLES.ContentEditor];
const worshipRoles = [ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ...adminRoles];

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'demo', component: DemoMosqueComponent },
  { path: 'welcome', component: AuthWelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: ShellComponent,
    canActivate: [dashboardGuard],
    children: [
      // —— Public read-only (guests + authenticated) ——
      { path: '', component: TodayComponent },
      { path: 'prayer-times', component: PrayerTimesComponent },
      { path: 'announcements', component: AnnouncementsComponent },
      { path: 'events', component: EventsComponent },

      // —— Super Admin ——
      { path: 'super', component: SuperDashboardComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/mosques', component: SuperMosquesComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/claims', component: SuperClaimsComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/users', component: SuperUsersComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/mosque-data', component: SuperMosqueDataComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/features', component: SuperFeaturesComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/audit', component: SuperAuditComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/settings', component: SuperSettingsComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/reports', component: SuperReportsComponent, canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/mosques/claims', redirectTo: 'super/claims', pathMatch: 'full' },
      { path: 'super/users/features', redirectTo: 'super/features', pathMatch: 'full' },

      // —— Mosque Owner ——
      { path: 'owner', component: OwnerDashboardComponent, canActivate: [authGuard, roleGuard([ROLES.MosqueOwner])] },
      { path: 'owner/claim', component: OwnerClaimComponent, canActivate: [authGuard, roleGuard([ROLES.MosqueOwner])] },
      { path: 'owner/staff', component: OwnerStaffComponent, canActivate: [authGuard, roleGuard([ROLES.MosqueOwner])] },

      // —— Mosque Management ——
      { path: 'admin/mosque', component: AdminMosqueComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/prayer-times', component: AdminPrayerTimesComponent, canActivate: [authGuard, roleGuard(prayerRoles)] },
      { path: 'admin/announcements', component: AdminAnnouncementsComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/events', component: AdminEventsComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/janaza', component: AdminJanazaComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/settings', component: AdminSettingsComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/communities', component: AdminCommunitiesComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/participation', component: AdminParticipationComponent, canActivate: [authGuard, roleGuard(adminRoles)] },
      { path: 'admin/madrassah', component: AdminMadrassahComponent, canActivate: [authGuard, roleGuard(adminRoles)] },

      // —— Teacher ——
      { path: 'teacher', component: TeacherDashboardComponent, canActivate: [authGuard, roleGuard(teacherRoles)] },
      { path: 'teacher/classes', component: TeacherClassesComponent, canActivate: [authGuard, roleGuard(teacherRoles)] },
      { path: 'teacher/attendance', component: TeacherAttendanceComponent, canActivate: [authGuard, roleGuard(teacherRoles)] },

      // —— Muqaddam ——
      { path: 'muqaddam', component: MuqaddamComponent, canActivate: [authGuard, roleGuard([ROLES.Muqaddam, ROLES.SuperAdmin])] },
      { path: 'muqaddam/readings', component: MuqaddamReadingsComponent, canActivate: [authGuard, roleGuard([ROLES.Muqaddam, ROLES.SuperAdmin])] },

      // —— Content Editor ——
      { path: 'content/awrad', component: ContentAwradComponent, canActivate: [authGuard, roleGuard(contentRoles)] },
      { path: 'content/duas', component: ContentDuasComponent, canActivate: [authGuard, roleGuard(contentRoles)] },
      { path: 'content/adhkar', component: ContentAdhkarComponent, canActivate: [authGuard, roleGuard(contentRoles)] },
      { path: 'content/ritual-guides', component: ContentRitualGuidesComponent, canActivate: [authGuard, roleGuard(contentRoles)] },

      // —— Parent ——
      { path: 'parent', component: ParentPortalComponent, canActivate: [authGuard, roleGuard([ROLES.Parent])] },

      // —— Personal worship ——
      { path: 'member/wird', component: MemberWirdComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/adhkar', component: MemberAdhkarComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/quran', component: MemberQuranComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/duas', component: MemberDuasComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/communities', component: MemberCommunitiesComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/readings', component: MemberReadingsComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'member/preferences', component: MemberPreferencesComponent, canActivate: [authGuard, roleGuard(worshipRoles)] },
    ]
  },
  { path: '**', redirectTo: '' }
];
