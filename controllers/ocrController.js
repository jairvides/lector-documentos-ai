require('dotenv').config(); // Aseguramos que el archivo .env se cargue

const { AzureKeyCredential, DocumentAnalysisClient } = require('@azure/ai-form-recognizer');
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph } = require('docx');
const PDFDocument = require('pdfkit');

// Configuración de Azure
const endpoint = process.env.AZURE_ENDPOINT;
const key = process.env.AZURE_KEY1; // Usamos AZURE_KEY1, si necesitas AZURE_KEY2 también, puedes modificarlo según tus necesidades.

const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

// Función para extraer texto del documento usando OCR
async function extractDocumentText(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const poller = await client.beginAnalyzeDocument("prebuilt-document", fileStream);
  const result = await poller.pollUntilDone();
  let lines = [];

  // Extraer el contenido de las páginas del documento
  if (result?.pages?.length > 0) {
    for (const page of result.pages) {
      for (const line of page.lines ?? []) {
        if (line.content) lines.push(line.content);
      }
    }
  } else if (result?.content) {
    lines = result.content.split('\n');
  } else {
    lines = ["No se pudo extraer texto del documento."];
  }
  return lines;
}

// Función para procesar y generar el documento en el formato solicitado
async function processDocument(filePath, format = 'docx') {
  // Extraemos el texto usando OCR
  const lines = await extractDocumentText(filePath);
  const timestamp = Date.now();
  let outputPath;

  // Asegurar que la carpeta 'outputs' existe
  if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

  switch (format) {
    case 'txt':
      outputPath = path.join("outputs", `documento-${timestamp}.txt`);
      fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
      break;
    case 'pdf':
      outputPath = path.join("outputs", `documento-${timestamp}.pdf`);
      const pdfDoc = new PDFDocument();
      pdfDoc.pipe(fs.createWriteStream(outputPath));
      lines.forEach(line => pdfDoc.text(line));
      pdfDoc.end();
      break;
    case 'docx':
    default:
      outputPath = path.join("outputs", `documento-${timestamp}.docx`);
      const paragraphs = lines.map(line => new Paragraph(line));
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(outputPath, buffer);
      break;
  }

  // Eliminar el archivo temporal en 'uploads' si existe
  if (filePath.includes('uploads')) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error("Error al eliminar el archivo temporal:", error);
    }
  }

  return outputPath;
}

// Función para obtener una preview del documento procesado
async function previewDocument(filePath) {
  const lines = await extractDocumentText(filePath);
  // Retornamos las primeras 10 líneas para la vista previa
  return lines.slice(0, 10);
}

module.exports = { processDocument, previewDocument };
