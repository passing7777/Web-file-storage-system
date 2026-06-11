import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/layout/MainLayout.vue'),
      redirect: '/files',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'files',
          name: 'Files',
          component: () => import('@/views/Files.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'trash',
          name: 'Trash',
          component: () => import('@/views/Trash.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'shares',
          name: 'Shares',
          component: () => import('@/views/Shares.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/Profile.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: '/share/:shareCode',
      name: 'ShareAccess',
      component: () => import('@/views/ShareAccess.vue'),
      meta: { requiresAuth: false },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (!to.meta.requiresAuth && authStore.isAuthenticated) {
    if (to.name === 'Login' || to.name === 'Register') {
      next({ name: 'Files' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;