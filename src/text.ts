// // server.ts
// import express from 'express';
// import multer from 'multer';
// import { extractTextFromPDF } from './textFromPdf';
// import { chunkText } from './Chunk';

// const app = express();
// const upload = multer({ dest: 'uploads/' }); // will store PDF in /uploads

// app.post('/upload-pdf', upload.single('file'), async (req, res) => {
//   try {
//     const filePath = req.file.path; // local path to uploaded file
//     const text = await extractTextFromPDF(filePath);
//     const chunks = chunkText(text, 400);
    
//     res.json({ chunks }); // you can store this in DB instead
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to process PDF' });
//   }
// });

// app.listen(3000, () => {
//   console.log('Server running on http://localhost:3000');
// });

