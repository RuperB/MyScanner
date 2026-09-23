export interface DocTypePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const DEFAULT_DOC_TYPES: DocTypePreset[] = [
  {
    id: 'facturas',
    name: 'Facturas',
    icon: 'receipt-outline',
    description: 'Facturas electrónicas, de venta o compra',
    color: '#3B82F6', // Blue
  },
  {
    id: 'cedulas',
    name: 'Cédulas',
    icon: 'id-card-outline',
    description: 'Cédula, pasaporte, licencia de conducir',
    color: '#10B981', // Emerald
  },
  {
    id: 'contratos',
    name: 'Contratos',
    icon: 'document-text-outline',
    description: 'Contratos de arrendamiento, laborales, acuerdos',
    color: '#8B5CF6', // Purple
  },
  {
    id: 'recibos',
    name: 'Recibos de Pago',
    icon: 'cash-outline',
    description: 'Servicios públicos, comprobantes de pago',
    color: '#F59E0B', // Amber
  },
  {
    id: 'certificados',
    name: 'Certificados',
    icon: 'ribbon-outline',
    description: 'Certificados bancarios, laborales o de estudio',
    color: '#EC4899', // Pink
  },
  {
    id: 'formularios',
    name: 'Formularios y Solicitudes',
    icon: 'clipboard-outline',
    description: 'Formatos diligenciados y solicitudes formales',
    color: '#06B6D4', // Cyan
  },
  {
    id: 'otros',
    name: 'Otros Documentos',
    icon: 'folder-outline',
    description: 'Documentos varios o no categorizados',
    color: '#64748B', // Slate
  },
];
