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
app.use(cors({ origin: '*', credentials: true }));

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

// MongoDB Schema
const voiceMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true }, // email or phone
  address: { type: String, required: true },
  audioPath: { type: String, required: true }
}, { timestamps: true });

const VoiceMessage = mongoose.model('VoiceMessage', voiceMessageSchema);

// Multer configuration for audio upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = './uploads/audio';
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `audio_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed.'));
    }
  }
});

// POST API to upload voice message and form data
app.post('/api/voice-message', upload.single('audio'), async (req, res) => {
  try {
    const { name, contact, address } = req.body;
    const audioPath = req.file?.path;
    console.log('BODY:', req.body);
console.log('FILE:', req.file);


    if (!name || !contact || !address || !audioPath) {
      return res.status(400).json({ message: 'All fields including audio are required.' });
    }

    const newMessage = new VoiceMessage({ name, contact, address, audioPath });
    await newMessage.save();

    res.status(201).json({ message: 'Voice message saved successfully.' });
  } catch (error) {
    console.error('Error saving voice message:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET API to fetch all voice messages
app.get('/api/voice-messages', async (req, res) => {
  try {
    const messages = await VoiceMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching voice messages:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
