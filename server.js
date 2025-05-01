
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(cors({ origin:'*', credentials: true}));

const server = http.createServer(app);
app.use(express.json());
const uri = process.env.MONGO_URI || "mongodb+srv://abhisheks:ijgha3sbMNK0Hfsu@cluster0.ul6vz.mongodb.net/Uradio?retryWrites=true&w=majority&appName=Cluster0";
app.use('/uploads', express.static('uploads'));
// MongoDB Connection
mongoose.connect(uri, {
  dbName: "Uradio",
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch(error => console.error(`MongoDB connection failed: ${error.message}`));

// Voice message Schema and api 1-05-2025
const voiceMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true }, // email or phone
  address: { type: String, required: true },
  audioPath: { type: String, required: true }
}, { timestamps: true });


const voiceMessage = mongoose.model('voiceMessage', voiceMessageSchema);

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (!['.mp3', '.wav', '.m4a'].includes(ext)) {
      return cb(new Error('Only audio files are allowed'));
    }
    cb(null, true);
  }
});

// POST: Save audio message
app.post('/api/voice-message', upload.single('audio'), async (req, res) => {
  try {
    const { name, contact, address } = req.body;
    const audio = req.file;

    if (!name || !contact || !address) {
      return res.status(400).json({ error: 'All fields including audio are required.' });
    }

    const newMessage = new voiceMessage({
      name,
      contact,
      address,
      audioPath: audio.path
    });

    await newMessage.save();
    res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Retrieve all voice messages
app.get('/api/voice-messages', async (req, res) => {
  try {
    const messages = await voiceMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});





const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});






