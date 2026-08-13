import { createRouter, createWebHistory } from 'vue-router'

import WeatherHomeView from '../views/WeatherHomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'weather-home',
      component: WeatherHomeView,
    },
    {
      path: '/map',
      name: 'weather-map',
      component: () => import('../views/WeatherMapView.vue'),
    },
    {
      path: '/cities',
      name: 'weather-cities',
      component: () => import('../views/WeatherCitiesView.vue'),
    },
    {
      path: '/planner',
      name: 'weather-planner',
      component: () => import('../views/WeatherPlannerView.vue'),
    },
    {
      path: '/about',
      name: 'weather-about',
      component: () => import('../views/WeatherAboutView.vue'),
    },
    {
      path: '/weather/:cityId',
      name: 'weather-detail',
      component: () => import('../views/WeatherDetailView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
