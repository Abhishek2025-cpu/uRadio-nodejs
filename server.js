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

app.post('/api/voice-message', async (req, res) => {
  try {
    console.log('➡️ Incoming Raw Audio Request');
    const { name, contact, address, audioBase64, extension } = req.body;

    if (!name || !contact || !address || !audioBase64 || !extension) {
      return res.status(400).json({ message: 'All fields including audioBase64 and extension are required.' });
    }

    // Decode and save the audio file
    const uploadDir = './uploads/audio';
    fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `audio_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, filename);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(filePath, audioBuffer);

    // Save to DB
    const newMessage = new VoiceMessage({
      name,
      contact,
      address,
      audioPath: filePath
    });
    await newMessage.save();


res.status(201).json({ message: '✅ Voice message saved successfully.' });
  } catch (err) {
    console.error('❌ Error saving voice message:', err);
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
