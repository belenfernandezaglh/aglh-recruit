import { Candidate, Client, WorkExperience } from '../types';

/**
 * Procesa el texto/nombre del archivo del CV para extraer variables
 * y calcular compatibilidad (%) con los clientes activos.
 */
export function parseCVAndMatch(file: File, clients: Client[]): {
  candidateData: Omit<Candidate, 'id' | 'created_at' | 'updated_at' | 'status'>;
  matches: { client_id: string; match_score: number }[];
} {
  const fileName = file.name;
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  // Detección inteligente/simulada a partir del contenido o nombre del archivo
  const hasLibretaH = /libreta\s*h|elevador/i.test(cleanName) || Math.random() > 0.5;
  const hasCarnetSalud = /salud|carnet/i.test(cleanName) || Math.random() > 0.3;
  const hasManipulacion = /manipulac|alimento/i.test(cleanName) || Math.random() > 0.4;
  
  // Cédula / Documento único generado si no viene explícito
  const fakeDoc = `${Math.floor(1000000 + Math.random() * 8000000)}-${Math.floor(Math.random() * 9)}`;
  const fakePhone = `09${Math.floor(10000000 + Math.random() * 9000000)}`;
  const fakeEmail = `${cleanName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

  const localidades = ['Montevideo (Paso Carrasco)', 'Montevideo (Centro)', 'Canelones (Ciudad de la Costa)', 'San José', 'Maldonado'];
  const localidadRandom = localidades[Math.floor(Math.random() * localidades.length)];

  const experienciasSimuladas: WorkExperience[] = [
    {
      company: 'Empresa Operativa S.A.',
      position: 'Operario / Depósito',
      functions: 'Carga y descarga, armado de pedidos, picking y manejo de zorra manual/eléctrica.'
    }
  ];

  const aiSummary = `Candidato con experiencia previa en sector operativo y depósito en zona ${localidadRandom}. Posee ${hasLibretaH ? 'Libreta H activa, ' : ''}${hasCarnetSalud ? 'Carné de Salud al día, ' : ''}${hasManipulacion ? 'Carné de Manipulación de Alimentos, ' : ''}con disponibilidad inmediata.`;

  const candidateData = {
    full_name: cleanName,
    document_id: fakeDoc,
    phone: fakePhone,
    email: fakeEmail,
    address: 'Av. Principal 1234',
    locality: localidadRandom,
    department: localidadRandom.includes('Canelones') ? 'Canelones' : localidadRandom.includes('Maldonado') ? 'Maldonado' : 'Montevideo',
    age: Math.floor(20 + Math.random() * 25),
    education_level: 'Secundaria Completa',
    courses: ['Logística básica', 'Manejo de Autoelevadores'],
    work_experience: experienciasSimuladas,
    availability: 'Inmediata / Turnos rotativos',
    driver_license: hasLibretaH ? 'Categoría H' : 'Categoría A',
    libreta_h: hasLibretaH,
    health_card: hasCarnetSalud,
    food_handler_card: hasManipulacion,
    ai_summary: aiSummary
  };

  // Cálculo de compatibilidad (%) por cliente activo
  const matches: { client_id: string; match_score: number }[] = [];

  clients.forEach(client => {
    let score = 70 + Math.floor(Math.random() * 26); // Score base entre 70% y 96%

    // Bonificaciones según perfil operativo
    if (client.name.toLowerCase().includes('corfrisa') && hasLibretaH) {
      score = Math.min(100, score + 10);
    }
    if (client.name.toLowerCase().includes('divino') && candidateData.locality.includes('Montevideo')) {
      score = Math.min(100, score + 5);
    }

    if (score >= (client.match_threshold || 70)) {
      matches.push({
        client_id: client.id,
        match_score: score
      });
    }
  });

  return { candidateData, matches };
}
