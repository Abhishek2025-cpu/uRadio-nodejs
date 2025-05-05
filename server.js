const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: '*', credentials: true }));

const server = http.createServer(app);

// Mongo URI
const uri = process.env.MONGO_URI || "mongodb+srv://abhisheks:ijgha3sbMNK0Hfsu@cluster0.ul6vz.mongodb.net/Uradio?retryWrites=true&w=majority&appName=Cluster0";

// Serve audio uploads statically
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(uri, {
  dbName: "Uradio",
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(error => console.error("❌ MongoDB connection failed:", error.message));

// Schema & Model
const voiceMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  address: { type: String, required: true },
  audioPath: { type: String, required: true }
}, { timestamps: true });

const VoiceMessage = mongoose.model('VoiceMessage', voiceMessageSchema); // ✅ UPPERCASE

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/audio';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `audio_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed.'));
    }
  }
});

// POST: Upload audio + form data
app.post('/api/voice-message', upload.single('audio'), async (req, res) => {
  try {
    console.log('➡️ Incoming Request');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    const { name, contact, address } = req.body;
    const audioPath = req.file?.path;

    if (!name || !contact || !address || !audioPath) {
      console.log('❗ Missing fields');
      return res.status(400).json({ message: 'All fields including audio are required.' });
    }

    const newMsg = new VoiceMessage({ name, contact, address, audioPath });
    await newMsg.save();

    res.status(201).json({ message: '✅ Voice message saved successfully.' });
  } catch (err) {
    console.error('❌ Error in POST /api/voice-message:', err);
    res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
});

// GET: Fetch messages
app.get('/api/voice-messages', async (req, res) => {
  try {
    const messages = await VoiceMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error('❌ Error fetching voice messages:', err);
    res.status(500).json({ message: 'Internal server error.', error: err.message });
  }
});

// Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
