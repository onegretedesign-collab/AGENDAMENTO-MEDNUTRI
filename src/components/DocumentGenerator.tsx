import { useState } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function DocumentGenerator({ type }: { type: 'Receituário' }) {
  const [patientName, setPatientName] = useState('');
  const [examRequest, setExamRequest] = useState('');

  const generatePDF = async () => {
    const input = document.getElementById('printable-document');
    if (!input) return;

    // Ensure image is loaded
    const img = input.querySelector('img');
    if (img && !img.complete) {
        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }

    const canvas = await html2canvas(input, { 
        scale: 3,
        useCORS: true, 
        logging: false 
    });
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    
    // Download the PDF
    pdf.save(`receituario_${patientName.replace(/\s+/g, '_') || 'documento'}.pdf`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Container for the image and inputs */}
      <div id="printable-document" className="relative w-full">
        <img 
          src="https://i.postimg.cc/28H82806/RECEITUARIO-2026-APP.jpg" 
          alt="Receituário" 
          className="w-full h-auto"
          referrerPolicy="no-referrer"
        />
        
        {/* Patient Name Input - Overlayed */}
        <input
          type="text"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          maxLength={120}
          className="absolute top-[26.2%] left-[12%] w-[80%] h-[6%] bg-transparent border-none focus:ring-0 text-base"
          placeholder="Nome do Paciente"
        />
        
        {/* Exam Request Textarea - Overlayed */}
        <textarea
          value={examRequest}
          onChange={(e) => setExamRequest(e.target.value)}
          maxLength={1000}
          className="absolute top-[35%] left-[12%] w-[80%] h-[40%] bg-transparent border-none focus:ring-0 text-base resize-none"
          placeholder="Solicitação de exames..."
        />
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 px-6 py-3 bg-[#05556C] text-white rounded-md hover:bg-[#044458] w-full justify-center"
        >
          <Download size={20} />
          Baixar PDF
        </button>
      </div>
    </div>
  );
}
