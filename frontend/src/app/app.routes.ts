import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/role.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: '',
    canActivateChild: [roleGuard(['member', 'guest'])],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        ({ MainLayoutComponent }) => MainLayoutComponent,
      ),
    children: [
      {
        path: '',
        title: 'My Space',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'home',
        title: 'My Space',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'settings',
        title: 'Settings - My Space',
        canActivate: [roleGuard(['member'])],
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { contentMaxWidth: '780px' },
      },
      {
        path: 'explore',
        title: 'My Space - Explore',
        loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent),
      },
      {
        path: 'friends',
        title: 'Bạn bè - My Space',
        canActivate: [roleGuard(['member'])],
        loadComponent: () =>
          import('./features/friends/friends.component').then(m => m.FriendsComponent),
      },
      {
        path: 'post/:id',
        title: 'My Space',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('./features/posts/post-detail/post-detail.component').then(m => m.PostDetailComponent),
      },
      {
        path: 'posts/:id',
        redirectTo: 'post/:id',
      },

      {
        path: 'profile',
        title: 'Profile - My Space',
        canActivate: [roleGuard(['member'])],
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { contentMaxWidth: '100%' },
      },
      {
        path: 'profile/:id',
        title: 'Profile - My Space',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { contentMaxWidth: '100%' },
      },

    ],
  },
  {
    path: 'auth/login',
    title: 'Login - My Space',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    title: 'Register - My Space',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    title: 'Forgot Password - My Space',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    title: 'Reset Password - My Space',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },

  {
    path: 'workspace/create',
    title: 'Create Post - My Space',
    canActivate: [roleGuard(['member'])],
    loadComponent: () =>
      import('./features/workspace/post-editor/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'create-post',
    redirectTo: 'workspace/create',
    pathMatch: 'full',
  },
  {
    path: 'workspace/posts/:id/edit',
    title: 'Edit Post - My Space',
    canActivate: [roleGuard(['member'])],
    loadComponent: () =>
      import('./features/workspace/post-editor/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'admin',
    title: 'Admin Panel - My Space',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'Admin Dashboard - My Space',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        title: 'Manage Users - My Space',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },

      {
        path: 'posts',
        title: 'Manage Posts - My Space',
        loadComponent: () =>
          import('./features/admin/posts/admin-posts.component').then(m => m.AdminPostsComponent),
      },

      {
        path: 'settings',
        title: 'Admin Settings - My Space',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { settingsContext: 'admin' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
