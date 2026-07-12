import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export const FloatWhatsAppBot = () => {
  const whatsappNumber = '573222223610';
  const defaultMessage = 'Hola Aguilera CEA, me gustaría obtener más información sobre los cursos de conducción.';
  const waLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;

  return (
    <motion.div 
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity : 1 }}
      transition={{ delay: 1, type : 'spring', stiffness : 260, damping : 20 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-gray-100 text-sm font-medium text-gray-700 animate-bounce">
        ¿Necesitas ayuda? ¡Contáctanos! 👋
      </div>
      <a 
        href={waLink} 
        target="_blank" 
        rel="noreferrer"
        className="bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
      >
        <MessageCircle className="w-8 h-8 group-hover:animate-pulse" />
      </a>
    </motion.div>
  );
};
