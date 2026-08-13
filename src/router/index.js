import { createRouter, createWebHistory } from 'vue-router'

import WeatherHomeView from '../views/WeatherHomeView.vue'

const supportedCityIds = [
  'seoul',
  'busan',
  'daegu',
  'incheon',
  'gwangju',
  'daejeon',
  'ulsan',
  'sejong',
  'suwon',
  'chuncheon',
  'cheongju',
  'hongseong',
  'jeonju',
  'muan',
  'andong',
  'changwon',
  'jeju',
].join('|')

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
      path: `/weather/:cityId(${supportedCityIds})`,
      name: 'weather-detail',
      component: () => import('../views/WeatherDetailView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
