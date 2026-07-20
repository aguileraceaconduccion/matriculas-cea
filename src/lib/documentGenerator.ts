import { PDFDocument, rgb } from 'pdf-lib';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const getFullDocTypeName = (code: string) => {
  const map: Record<string, string> = {
    'CC': 'Cédula de Ciudadanía',
    'TI': 'Tarjeta de Identidad',
    'CE': 'Cédula de Extranjería',
    'PPT': 'Permiso por Protección Temporal',
    'PAS': 'Pasaporte'
  };
  return map[code] || code;
};

export interface HabeasDataInput {
  studentName: string;
  documentType: string;
  documentNumber: string;
  signatureDataUrl: string;
  isMinor: boolean;
  tutorName?: string;
  tutorDocument?: string;
  tutorSignatureDataUrl?: string;
}

export const generateHabeasDataPDF = async (input: HabeasDataInput): Promise<File> => {
  try {
    const baseUrl = import.meta.env.BASE_URL;
    const url = `${baseUrl}HABEAS DATA ACTUALIZADO OBLIGATORIO.pdf`;
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // Embed student signature
    const signatureImageBytes = await fetch(input.signatureDataUrl).then(res => res.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const signatureDims = signatureImage.scale(0.2);

    // Get current date
    const today = new Date();
    const dateStr = `${today.getDate()} de ${today.toLocaleString('es-CO', { month: 'long' })} de ${today.getFullYear()}`;

    // Draw Student Signature & Info (Left side)
    lastPage.drawImage(signatureImage, {
      x: 88,
      y: 326,
      width: signatureDims.width,
      height: signatureDims.height,
    });

    lastPage.drawText(input.studentName, {
      x: 88,
      y: 296,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(getFullDocTypeName(input.documentType), {
      x: 88,
      y: 266,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(input.documentNumber, {
      x: 82,
      y: 241,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`Bogotá, ${dateStr}`, {
      x: 82,
      y: 211,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Draw Tutor Signature & Info if Minor (Right side)
    if (input.isMinor && input.tutorSignatureDataUrl && input.tutorName) {
      const tutorSignatureBytes = await fetch(input.tutorSignatureDataUrl).then(res => res.arrayBuffer());
      const tutorSignatureImage = await pdfDoc.embedPng(tutorSignatureBytes);
      const tutorSigDims = tutorSignatureImage.scale(0.2);

      lastPage.drawImage(tutorSignatureImage, {
        x: 333,
        y: 326,
        width: tutorSigDims.width,
        height: tutorSigDims.height,
      });

      lastPage.drawText(input.tutorName, {
        x: 333,
        y: 296,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(getFullDocTypeName('CC'), {
        x: 333,
        y: 266,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(input.tutorDocument || '', {
        x: 327,
        y: 241,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Bogotá, ${dateStr}`, {
        x: 327,
        y: 211,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }

    // Save and return File
    const pdfBytes = await pdfDoc.save();
    const cleanStudentName = input.studentName.replace(/[^a-zA-Z0-9]/g, '_');
    return new File([pdfBytes as any], `HabeasData_${cleanStudentName}.pdf`, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating Habeas Data PDF:', error);
    throw error;
  }
};

export const generateFichaMatriculaDocx = async (studentData: any): Promise<File> => {
  try {
    const baseUrl = import.meta.env.BASE_URL;
    const url = `${baseUrl}Ficha Matricula.docx`;
    const content = await fetch(url).then(res => res.arrayBuffer());

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { 
      paragraphLoop: true, 
      linebreaks: true 
    });

    const today = new Date();
    const cleanStudentName = `${studentData.nombres || ''} ${studentData.apellidos || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');

    // Mapear campos para coincidir con la plantilla DOCX
    const renderData = {
      ...studentData,
      tipo_documento: getFullDocTypeName(studentData.tipo_documento || ''),
      nombres_completos: `${studentData.nombres || ''} ${studentData.apellidos || ''}`.trim(),
      fecha_hoy: today.toLocaleDateString('es-CO'),
      ano: today.getFullYear().toString(),
      mes: (today.getMonth() + 1).toString().padStart(2, '0'),
      dia: today.getDate().toString().padStart(2, '0'),
      // Soporte para acudiente si aplica
      acudiente_nombre: studentData.acudiente_nombre || 'N/A',
      acudiente_documento: studentData.acudiente_documento || 'N/A',
      acudiente_celular: studentData.acudiente_celular || 'N/A',
    };

    doc.render(renderData);

    const modifiedBlob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return new File([modifiedBlob], `FichaMatricula_${cleanStudentName}.docx`, { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
  } catch (error) {
    console.error('Error generating Ficha Matricula DOCX:', error);
    throw error;
  }
};

export const convertImagesToPdf = async (frontDataUrl: string, backDataUrl: string, studentName: string): Promise<File> => {
  try {
    const pdfDoc = await PDFDocument.create();
    
    // Una sola hoja A4
    const page = pdfDoc.addPage([595.28, 841.89]); 
    const pageW = page.getWidth();
    const pageH = page.getHeight();

    // Imagen frontal (Mitad superior)
    const frontImageBytes = await fetch(frontDataUrl).then(res => res.arrayBuffer());
    const frontImage = frontDataUrl.startsWith('data:image/png') 
      ? await pdfDoc.embedPng(frontImageBytes) 
      : await pdfDoc.embedJpg(frontImageBytes);
      
    const frontDims = frontImage.scaleToFit(500, 350);
    page.drawImage(frontImage, {
      x: pageW / 2 - frontDims.width / 2,
      y: (pageH * 0.75) - (frontDims.height / 2),
      width: frontDims.width,
      height: frontDims.height,
    });

    // Imagen reverso (Mitad inferior)
    const backImageBytes = await fetch(backDataUrl).then(res => res.arrayBuffer());
    const backImage = backDataUrl.startsWith('data:image/png') 
      ? await pdfDoc.embedPng(backImageBytes) 
      : await pdfDoc.embedJpg(backImageBytes);
      
    const backDims = backImage.scaleToFit(500, 350);
    page.drawImage(backImage, {
      x: pageW / 2 - backDims.width / 2,
      y: (pageH * 0.25) - (backDims.height / 2),
      width: backDims.width,
      height: backDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    const cleanStudentName = studentName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    return new File([pdfBytes as any], `Cedula_${cleanStudentName}.pdf`, { type: 'application/pdf' });
  } catch (error) {
    console.error('Error converting images to PDF:', error);
    throw error;
  }
};
