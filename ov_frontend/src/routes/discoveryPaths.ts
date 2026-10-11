export const discoveryPaths = {
  helena: '/student/profile/helena',
  helenaPage: (id: string) => `/student/profile/helena/${encodeURIComponent(id)}`,
  researchGuide: '/student/research/guion',
  career: (id: string) => `/student/catalog/careers/${encodeURIComponent(id)}`,
  occupation: (id: string) => `/student/catalog/professions/${encodeURIComponent(id)}`,
  institution: (id: string) => `/student/catalog/institutions/${encodeURIComponent(id)}`,
}
