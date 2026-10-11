type CareerCatalogItem = {
  id: string
  name: string
  area: string
  description: string
  duration: string
  opportunities: string[]
}

type InstitutionCatalogItem = {
  id: string
  name: string
  type: string
  description: string
  location: string
  studyAreas: string[]
}

const careerCatalog: CareerCatalogItem[] = [
  {
    id: 'environmental-engineering',
    name: 'Ingeniería Ambiental',
    area: 'Ingeniería y ambiente',
    description: 'Diseña soluciones para prevenir, medir y reducir impactos sobre el ambiente.',
    duration: '5 años aproximadamente',
    opportunities: ['Gestión ambiental', 'Prevención de riesgos', 'Consultoría', 'Sector público'],
  },
  {
    id: 'journalism',
    name: 'Periodismo',
    area: 'Comunicación',
    description: 'Investiga hechos, contrasta fuentes y comunica información de interés público.',
    duration: '5 años aproximadamente',
    opportunities: ['Medios', 'Comunicación institucional', 'Investigación', 'Producción digital'],
  },
  {
    id: 'nursing',
    name: 'Enfermería',
    area: 'Salud',
    description:
      'Brinda cuidados integrales y acompaña a las personas en prevención, atención y recuperación.',
    duration: '5 años aproximadamente',
    opportunities: ['Hospitales', 'Centros de salud', 'Emergencias', 'Salud comunitaria'],
  },
  {
    id: 'civil-engineering',
    name: 'Ingeniería Civil',
    area: 'Ingeniería e infraestructura',
    description: 'Planifica, construye y evalúa infraestructura segura para las comunidades.',
    duration: '5 años aproximadamente',
    opportunities: ['Construcción', 'Gestión de riesgos', 'Transporte', 'Obras públicas'],
  },
  {
    id: 'veterinary-medicine',
    name: 'Medicina Veterinaria',
    area: 'Salud y ciencias naturales',
    description: 'Protege la salud y el bienestar de animales domésticos, productivos y silvestres.',
    duration: '5 años aproximadamente',
    opportunities: ['Clínicas', 'Conservación', 'Salud pública', 'Producción animal'],
  },
  {
    id: 'psychology',
    name: 'Psicología',
    area: 'Ciencias sociales y salud',
    description: 'Comprende el comportamiento humano y acompaña procesos de bienestar y desarrollo.',
    duration: '5 años aproximadamente',
    opportunities: ['Salud', 'Educación', 'Organizaciones', 'Intervención comunitaria'],
  },
]

const institutionCatalog: InstitutionCatalogItem[] = [
  {
    id: 'public-universities',
    name: 'Universidades públicas',
    type: 'Educación universitaria',
    description:
      'Instituciones con programas profesionales y académicos en múltiples áreas del conocimiento.',
    location: 'Distintas regiones del país',
    studyAreas: ['Ingenierías', 'Salud', 'Ciencias', 'Humanidades'],
  },
  {
    id: 'private-universities',
    name: 'Universidades privadas',
    type: 'Educación universitaria',
    description:
      'Instituciones que ofrecen carreras profesionales, especializaciones y experiencias de formación diversas.',
    location: 'Presencial, semipresencial y virtual',
    studyAreas: ['Negocios', 'Tecnología', 'Comunicación', 'Diseño'],
  },
  {
    id: 'technical-institutes',
    name: 'Institutos tecnológicos',
    type: 'Educación técnica',
    description: 'Formación práctica y especializada orientada a una rápida incorporación al mundo laboral.',
    location: 'Sedes urbanas y regionales',
    studyAreas: ['Tecnología', 'Industria', 'Administración', 'Servicios'],
  },
  {
    id: 'art-schools',
    name: 'Escuelas superiores de arte y diseño',
    type: 'Educación artística',
    description: 'Espacios especializados en disciplinas creativas, producción visual y comunicación.',
    location: 'Principales ciudades',
    studyAreas: ['Diseño', 'Artes visuales', 'Audiovisuales', 'Animación'],
  },
  {
    id: 'emergency-training-centers',
    name: 'Centros de formación en emergencias',
    type: 'Formación especializada',
    description:
      'Preparan para responder ante riesgos, emergencias médicas y situaciones de protección civil.',
    location: 'Oferta regional y nacional',
    studyAreas: ['Primeros auxilios', 'Rescate', 'Prevención', 'Seguridad'],
  },
]

export { careerCatalog, institutionCatalog }
export type { CareerCatalogItem, InstitutionCatalogItem }
