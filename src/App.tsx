import { useState, useEffect } from 'react';
import { Instagram, Download } from 'lucide-react';
import Chat from './components/Chat';
import Login from './components/Login';
import AttendantView from './components/AttendantView';

const CITIES = ['Quirinópolis', 'Caçu', 'São Simão'];
const WHATSAPP_NUMBER = '5564984530700';


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('mednutri_isLoggedIn') === 'true');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [selectedCity, setSelectedCity] = useState<string | null>(() => localStorage.getItem('mednutri_city'));
  const [name, setName] = useState(() => localStorage.getItem('mednutri_name') || '');
  const [contact, setContact] = useState(() => localStorage.getItem('mednutri_contact') || '');
  const [consultationType, setConsultationType] = useState<string | null>(() => localStorage.getItem('mednutri_type'));
  const [step, setStep] = useState<'welcome' | 'select' | 'type' | 'input' | 'final'>('welcome');
  const [showConfirmBack, setShowConfirmBack] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    if (selectedCity) localStorage.setItem('mednutri_city', selectedCity);
    else localStorage.removeItem('mednutri_city');
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('mednutri_name', name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem('mednutri_contact', contact);
  }, [contact]);

  useEffect(() => {
    if (consultationType) localStorage.setItem('mednutri_type', consultationType);
    else localStorage.removeItem('mednutri_type');
  }, [consultationType]);

  useEffect(() => {
    localStorage.setItem('mednutri_step', step);
  }, [step]);

  const normalizedPath = currentPath.replace(/\/$/, "");
  console.log('Current path:', normalizedPath, 'Is logged in:', isLoggedIn);

  if (normalizedPath === '/attendant') {
    if (!isLoggedIn) {
      return <Login onLogin={() => {
        localStorage.setItem('mednutri_isLoggedIn', 'true');
        setIsLoggedIn(true);
      }} />;
    }
    return <AttendantView onLogout={() => {
      localStorage.removeItem('mednutri_isLoggedIn');
      setIsLoggedIn(false);
      window.location.href = '/';
    }} />;
  }

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setStep('type');
  };

  const handleTypeSelect = (type: string) => {
    setConsultationType(type);
    setStep('input');
  };

  const handleConfirm = () => {
    if (name.trim() && contact.trim() && selectedCity && consultationType) {
      fetch('/api/notify-attendant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: name, contact, city: selectedCity, type: consultationType }),
      }).catch(console.error);
      setStep('final');
    }
  };

  const handleBack = () => {
    setShowConfirmBack(true);
  };

  const confirmBack = () => {
    if (step === 'type') {
      setStep('select');
      setSelectedCity(null);
    } else if (step === 'input') {
      setStep('type');
      setConsultationType(null);
    } else if (step === 'final') {
      setStep('input');
    }
    setShowConfirmBack(false);
  };

  const handleReset = () => {
    setStep('welcome');
    setSelectedCity(null);
    setName('');
    setContact('');
    setConsultationType(null);
    localStorage.removeItem('mednutri_city');
    localStorage.removeItem('mednutri_name');
    localStorage.removeItem('mednutri_contact');
    localStorage.removeItem('mednutri_type');
    localStorage.setItem('mednutri_step', 'welcome');
  };

  const getWhatsAppLink = () => {
    const message = consultationType === 'Retorno' 
      ? `Olá, meu nome é ${name} e gostaria de um retorno em ${selectedCity}.`
      : `Olá, meu nome é ${name} e gostaria de uma nova consulta em ${selectedCity}.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] text-gray-900 flex flex-col items-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-2 mt-2">
        {step !== 'welcome' && (
          <h1 className="text-xl font-bold text-[#05556C] mb-2">MedNutri Agendamento</h1>
        )}
        {step !== 'welcome' && (
          <div className="flex flex-col items-center gap-0">
            <img 
              src="https://i.postimg.cc/3NpGvWRP/DR-EMERSON-FOTO-PARA-PERFIL-DO-APP.jpg" 
              alt="Dr. Emerson" 
              className="w-56 h-56 rounded-full object-cover border-4 border-[#05556C]"
              referrerPolicy="no-referrer"
            />
            <img 
              src="https://i.postimg.cc/xdWBPF5w/LOGO-NOVA-DR-EMERSON-LUIZ.png" 
              alt="Logo MedNutri" 
              className="w-[27rem] h-auto -mt-6"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {step === 'welcome' && (
          <div className="w-full flex flex-col items-center gap-8 mt-12">
            <img 
              src="https://i.postimg.cc/xdWBPF5w/LOGO-NOVA-DR-EMERSON-LUIZ.png" 
              alt="Logo MedNutri" 
              className="w-full max-w-xs h-auto"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setStep('select')}
              className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-md text-lg"
              style={{ backgroundColor: '#05556C' }}
            >
              Agendar Consulta
            </button>
            <a 
              href="https://play.google.com/store/apps/details?id=com.mednutri.app" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-xl text-[#05556C] font-semibold text-center hover:bg-gray-100 transition-colors border border-[#05556C] text-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar App
            </a>
            <button 
              onClick={() => {
                window.history.pushState({}, '', '/attendant');
                setCurrentPath('/attendant');
              }}
              className="w-full py-4 rounded-xl text-gray-500 font-semibold text-center hover:bg-gray-100 transition-colors border border-gray-300 text-lg"
            >
              Área do Atendente
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="w-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Escolha sua cidade</h1>
            {CITIES.map(city => (
              <button 
                key={city}
                onClick={() => handleCitySelect(city)}
                className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-md"
                style={{ backgroundColor: '#05556C' }}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {step === 'type' && (
          <div className="w-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Qual o tipo de consulta?</h1>
            <p className="text-center text-gray-600">Cidade selecionada: <span className="font-semibold text-[#05556C]">{selectedCity}</span></p>
            <button 
              onClick={() => handleTypeSelect('Nova Consulta')}
              className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-md"
              style={{ backgroundColor: '#05556C' }}
            >
              Nova Consulta
            </button>
            <button 
              onClick={() => handleTypeSelect('Retorno')}
              className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-md border-2 border-[#05556C] !text-[#05556C] !bg-white"
            >
              Retorno
            </button>
            <button 
              onClick={handleBack}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              ← Voltar para cidades
            </button>
          </div>
        )}

        {step === 'input' && (
          <div className="w-full flex flex-col gap-4">
            <h1 className="text-2xl font-bold text-center">Olá! Qual o seu nome e contato?</h1>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome aqui"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-[#05556C] outline-none transition-colors"
            />
            <input 
              type="tel" 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Digite seu WhatsApp/Contato"
              className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-[#05556C] outline-none transition-colors"
            />
            <button 
              onClick={handleConfirm}
              className="w-full py-4 rounded-xl text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-md"
              style={{ backgroundColor: '#05556C' }}
            >
              Confirmar
            </button>
            <button 
              onClick={handleBack}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              ← Voltar para tipo de consulta
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
            <Chat name={name} contact={contact} />
            <button 
              onClick={handleBack}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              ← Voltar para o nome
            </button>
            <button 
              onClick={handleReset}
              className="w-full py-3 mt-2 bg-gray-100 text-[#05556C] font-semibold rounded-xl hover:bg-gray-200 transition-colors border border-[#05556C]/10"
            >
              Voltar para o início
            </button>
            <p className="mt-4 text-sm text-gray-500">A mednutri agradece pela preferência.</p>
          </div>
        )}
      </div>

      {step !== 'welcome' && (
        <footer className="mt-auto py-6 flex flex-col items-center gap-2">
          <a href="https://www.instagram.com/dr.emersonluiz/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600">
            <Instagram size={24} />
            <span>@Dr.Emerson</span>
          </a>
        </footer>
      )}

      {showConfirmBack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-2">Deseja voltar?</h2>
            <p className="text-gray-600 mb-6">
              Você perderá as informações selecionadas neste passo se decidir voltar agora.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmBack}
                className="w-full py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                Sim, desejo voltar
              </button>
              <button
                onClick={() => setShowConfirmBack(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Continuar agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
