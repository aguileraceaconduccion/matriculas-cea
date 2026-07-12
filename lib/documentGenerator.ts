import { PDFDocument, rgb } from 'pdf-lib';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

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
    const url = '/HABEAS DATA ACTUALIZADO OBLIGATORIO.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // Embed student signature
    const signatureImageBytes = await fetch(input.signatureDataUrl).then(res => res.arrayBuffer());
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
    const signatureDims = signatureImage.scale(0.3);

    // Get current date
    const today = new Date();
    const dateStr = `${today.getDate()} de ${today.toLocaleString('es-CO', { month: 'long' })} de ${today.getFullYear()}`;

    // Draw Student Signature & Info (Left side)
    lastPage.drawImage(signatureImage, {
      x: 50,
      y: 290,
      width: signatureDims.width,
      height: signatureDims.height,
    });

    lastPage.drawText(input.studentName, {
      x: 100,
      y: 265,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(input.documentType, {
      x: 160,
      y: 235,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(input.documentNumber, {
      x: 190,
      y: 205,
      size: 10,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`Bogotá, ${dateStr}`, {
      x: 140,
      y: 175,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Draw Tutor Signature & Info if Minor (Right side)
    if (input.isMinor && input.tutorSignatureDataUrl && input.tutorName) {
      const tutorSignatureBytes = await fetch(input.tutorSignatureDataUrl).then(res => res.arrayBuffer());
      const tutorSignatureImage = await pdfDoc.embedPng(tutorSignatureBytes);
      const tutorSigDims = tutorSignatureImage.scale(0.3);

      lastPage.drawImage(tutorSignatureImage, {
        x: 320,
        y: 290,
        width: tutorSigDims.width,
        height: tutorSigDims.height,
      });

      lastPage.drawText(input.tutorName, {
        x: 430,
        y: 265,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText('CC', {
        x: 460,
        y: 235,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(input.tutorDocument || '', {
        x: 480,
        y: 205,
        size: 10,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`Bogotá, ${dateStr}`, {
        x: 400,
        y: 175,
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
    const url = '/Ficha Matricula.docx';
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
