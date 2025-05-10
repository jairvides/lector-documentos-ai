const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { previewDocument, processDocument } = require('./controllers/ocrController');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware para servir archivos estáticos
app.use(express.static('public'));

// Ruta para cargar el formulario HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para previsualizar el documento
app.post('/preview', upload.single('document'), async (req, res) => {
  try {
    const previewText = await previewDocument(req.file.path);
    res.json({ previewText });
  } catch (error) {
    console.error(error);
    // Se envía un JSON válido en caso de error
    res.status(500).json({ error: 'Error al generar la previsualización.' });
  }
});

// Ruta para subir y procesar el documento
app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const format = req.body.format || 'docx';

    const outputPath = await processDocument(filePath, format);

    res.download(outputPath, err => {
      if (err) {
        console.error("Error al enviar el archivo:", err);
        res.status(500).send("No se pudo enviar el archivo procesado.");
      } else {
        fs.unlinkSync(filePath);
        fs.unlinkSync(outputPath);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ocurrió un error al procesar el documento.');
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT);
