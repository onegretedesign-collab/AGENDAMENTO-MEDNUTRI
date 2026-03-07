import { useState } from 'react';
import { Instagram } from 'lucide-react';

const CITIES = ['Quirinópolis', 'Caçu', 'São Simão'];
const WHATSAPP_NUMBER = '5564984530700';

export default function App() {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [step, setStep] = useState<'select' | 'input' | 'final'>('select');

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setStep('input');
  };

  const handleConfirm = () => {
    if (name.trim()) {
      setStep('final');
    }
  };

  const getWhatsAppLink = () => {
    const message = `Olá, meu nome é ${name} e gostaria de agendar uma consulta em ${selectedCity}.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-gray-900 flex flex-col items-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6 mt-10">
        <div className="flex flex-col items-center gap-0">
          <img 
            src="https://i.postimg.cc/3NpGvWRP/DR-EMERSON-FOTO-PARA-PERFIL-DO-APP.jpg" 
            alt="Dr. Emerson" 
            className="w-40 h-40 rounded-full object-cover border-4 border-[#05556C]"
            referrerPolicy="no-referrer"
          />
          <img 
            src="https://i.postimg.cc/xdWBPF5w/LOGO-NOVA-DR-EMERSON-LUIZ.png" 
            alt="Logo MedNutri" 
            className="w-[27rem] h-auto -mt-4"
            referrerPolicy="no-referrer"
          />
        </div>

        {step === 'select' && (
          <div className="w-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Escolha sua cidade</h1>
            {CITIES.map(city => (
              <button 
                key={city}
                onClick={() => handleCitySelect(city)}
                className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: '#05556C' }}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {step === 'input' && (
          <div className="w-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Olá! Qual o seu nome?</h1>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome aqui"
              className="w-full p-4 border-2 border-gray-300 rounded-xl"
            />
            <button 
              onClick={handleConfirm}
              className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200"
              style={{ backgroundColor: '#05556C' }}
            >
              Confirmar
            </button>
          </div>
        )}

        {step === 'final' && (
          <div className="w-full flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-bold">Pronto! Primeiro passo dado.</h1>
            <p className="text-gray-700">Agora você falará com nossa equipe para finalizar seu agendamento diretamente com ela pelo nosso whatsapp.</p>
            <a 
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl text-white font-semibold text-center hover:scale-105 transition-transform duration-200"
              style={{ backgroundColor: '#05556C' }}
            >
              Falar no WhatsApp
            </a>
            <p className="mt-4 text-sm text-gray-500">A mednutri agradece pela preferência.</p>
          </div>
        )}
      </div>

      <footer className="mt-auto py-6 flex flex-col items-center gap-2">
        <a href="https://www.instagram.com/dr.emersonluiz/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600">
          <Instagram size={24} />
          <span>@Dr.Emerson</span>
        </a>
      </footer>
    </div>
  );
}
