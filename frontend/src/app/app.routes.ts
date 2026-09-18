import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { AuthWelcomeComponent } from './modules/auth/auth-welcome/auth-welcome.component';
import { LoginComponent } from './modules/auth/login/login.component';
import { AuthCallbackComponent } from './modules/auth/auth-callback/auth-callback.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { VerifyOtpComponent } from './modules/auth/verify-otp/verify-otp.component';
import { VerifyEmailComponent } from './modules/auth/verify-email/verify-email.component';
import { VerifyEmailPendingComponent } from './modules/auth/verify-email-pending/verify-email-pending.component';
import { TodayComponent } from './modules/home/today/today.component';
import { LandingComponent } from './modules/home/landing/landing.component';
import { MosqueProfilePageComponent } from './modules/home/mosque-profile-page/mosque-profile-page.component';
import { MosqueDirectoryComponent } from './modules/home/mosque-directory/mosque-directory.component';
import { MosqueRequestComponent } from './modules/home/mosque-request/mosque-request.component';
import { PrayerTimesComponent } from './modules/prayer-times/prayer-times.component';
import { AnnouncementsComponent } from './modules/announcements/announcements.component';
import { EventsComponent } from './modules/events/events.component';
import { authGuard, dashboardGuard } from './core/auth/auth.guard';
import { guestPublicGuard } from './core/auth/guest-public.guard';
import { roleGuard } from './core/auth/role.guard';
import { mosqueAdminOwnerGuard } from './core/auth/mosque-admin-owner.guard';
import { UnauthorizedComponent } from './modules/home/unauthorized/unauthorized.component';
import { ROLES } from './core/constants/roles';

// Super Admin — lazy loaded
// Mosque Owner — lazy loaded
// Mosque Admin — lazy loaded
// Teacher — lazy loaded
// Muqaddam — lazy loaded
// Content Editor — lazy loaded
// Parent
import { ParentPortalComponent } from './modules/parent/parent-portal.component';
import { MemberParticipationComponent } from './modules/participation/member-participation.component';
// Member spiritual — lazy loaded
import { worshipRoles } from './modules/member/member.routes';

const adminRoles = [ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];
const mosqueAdminOnly = [ROLES.MosqueAdmin, ROLES.SuperAdmin, ROLES.MosqueOwner];
const prayerRoles = [ROLES.SuperAdmin, ROLES.MosqueAdmin, ROLES.PrayerTimesEditor];
const contentRolesGuard = [ROLES.ContentEditor, ROLES.Muqaddam, ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin];

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'mosques', component: MosqueDirectoryComponent },
  { path: 'mosques/request', component: MosqueRequestComponent },
  { path: 'find-mosque', redirectTo: 'mosques', pathMatch: 'full' },
  { path: 'claim-mosque/:slug', loadComponent: () => import('./modules/home/claim-mosque-page/claim-mosque-page.component').then(m => m.ClaimMosquePageComponent) },
  { path: 'mosque/:slug/claim', component: MosqueProfilePageComponent, data: { openClaim: true } },
  { path: 'mosque/:slug', component: MosqueProfilePageComponent },
  { path: 'mosques/:slug', redirectTo: 'mosque/:slug', pathMatch: 'full' },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'admin/mosque/:id/edit', redirectTo: 'dashboard/admin/mosque', pathMatch: 'full' },
  { path: 'browse', redirectTo: 'dashboard/guest', pathMatch: 'full' },
  { path: 'welcome', component: AuthWelcomeComponent },
  { path: 'auth/login', component: LoginComponent },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'auth/forgot-password', loadComponent: () => import('./modules/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'auth/reset-password', loadComponent: () => import('./modules/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: 'verify-email-pending', component: VerifyEmailPendingComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'invite/accept', loadComponent: () => import('./modules/auth/invite-accept/invite-accept.component').then(m => m.InviteAcceptComponent) },
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

      // —— Guest (public read-only, lazy) ——
      { path: 'guest', loadChildren: () => import('./modules/guest/guest.routes').then(m => m.GUEST_ROUTES), canActivate: [guestPublicGuard] },
      { path: 'guest/updates', redirectTo: 'guest/announcements', pathMatch: 'full' },

      // —— Super Admin (lazy) ——
      { path: 'super', loadChildren: () => import('./modules/super/super.routes').then(m => m.SUPER_ROUTES), canActivate: [authGuard, roleGuard([ROLES.SuperAdmin])] },
      { path: 'super/mosque-assignment', redirectTo: 'super/users', pathMatch: 'full' },
      { path: 'super/users/features', redirectTo: 'super/features', pathMatch: 'full' },

      // —— Mosque Owner (lazy) ——
      { path: 'owner', loadChildren: () => import('./modules/owner/owner.routes').then(m => m.OWNER_ROUTES), canActivate: [authGuard, roleGuard([ROLES.MosqueOwner])] },

      // —— Mosque Admin dashboard (owner-scoped) ——
      { path: 'mosque', loadChildren: () => import('./modules/mosque/mosque.routes').then(m => m.MOSQUE_ROUTES), canActivate: [authGuard, roleGuard([ROLES.MosqueAdmin]), mosqueAdminOwnerGuard] },

      // —— Mosque Management (lazy) ——
      { path: 'admin', loadChildren: () => import('./modules/admin/admin.routes').then(m => m.ADMIN_ROUTES), canActivate: [authGuard, roleGuard(mosqueAdminOnly)] },

      // —— Teacher (lazy) ——
      { path: 'teacher', loadChildren: () => import('./modules/teacher/teacher.routes').then(m => m.TEACHER_ROUTES), canActivate: [authGuard, roleGuard([ROLES.Teacher, ROLES.SuperAdmin, ROLES.MosqueOwner, ROLES.MosqueAdmin])] },

      // —— Prayer Times Editor (lazy) ——
      { path: 'prayer-editor', loadChildren: () => import('./modules/prayer-editor/prayer-editor.routes').then(m => m.PRAYER_EDITOR_ROUTES), canActivate: [authGuard, roleGuard([ROLES.PrayerTimesEditor])] },

      // —— Muqaddam (lazy) ——
      { path: 'muqaddam', loadChildren: () => import('./modules/muqaddam/muqaddam.routes').then(m => m.MUQADDAM_ROUTES), canActivate: [authGuard, roleGuard([ROLES.Muqaddam, ROLES.SuperAdmin])] },

      // —— Content Editor (lazy) ——
      { path: 'content', loadChildren: () => import('./modules/content/content.routes').then(m => m.CONTENT_ROUTES), canActivate: [authGuard, roleGuard(contentRolesGuard)] },

      // —— Parent ——
      { path: 'parent', component: ParentPortalComponent, canActivate: [authGuard, roleGuard([ROLES.Parent])] },

      // —— Personal worship (lazy) ——
      { path: 'member', loadChildren: () => import('./modules/member/member.routes').then(m => m.MEMBER_ROUTES), canActivate: [authGuard, roleGuard(worshipRoles)] },
      { path: 'participation', component: MemberParticipationComponent, canActivate: [authGuard, roleGuard([ROLES.Member, ROLES.Parent, ROLES.Muqaddam, ROLES.SuperAdmin, ROLES.MosqueAdmin, ROLES.MosqueOwner])] },
    ]
  },
  { path: '**', redirectTo: '' }
];
