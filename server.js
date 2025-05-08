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

// Make sure folders exist
const imageDir = path.join(__dirname, 'uploads/images');
const audioDir = path.join(__dirname, 'uploads/audios');

if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });


// Schema & Model APIs for Voice Messages 5-5-2025
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


//live streaming schema and api 07-05-2025

const streamSchema = new mongoose.Schema({
  name: String,
  channel_id: Number,
  type: String,
  source_type: String,
  real_type: String,
  free: Boolean,
  blocked: Boolean,
  deleted: Boolean,
  maintained: Boolean,
  live: {
    application_instance: Object,
    bytes_in: Object,
    bytes_out: Object,
    bytes_in_rate: Object,
    bytes_out_rate: Object,
    server_name: Object,
    total_connections: Object,
  },
  restriction: {
    access_country: Object,
    allow_domain: Object,
    authorize_country: Object,
    exception_ip: Object,
    forbidden_ip: Object,
    player_token: Object,
    shared_key: Object,
  },
  streams: [Object],
  players: [Object],
  recording_status: String,
  updated_at: Date,
});

const Stream = mongoose.model('Stream', streamSchema);

app.post('/streams', async (req, res) => {
  try {
    const newStream = new Stream(req.body);
    await newStream.save();
    res.status(201).json({ message: 'Stream created', stream: newStream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get all streams
app.get('/streams', async (req, res) => {
  try {
    const streams = await Stream.find();
    res.json(streams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get a single stream by ID
app.get('/streams/:id', async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update a stream (toggle or edit)
app.put('/streams/:id', async (req, res) => {
  try {
    const updatedStream = await Stream.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true }
    );
    if (!updatedStream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ message: 'Stream updated', stream: updatedStream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete a stream
app.delete('/streams/:id', async (req, res) => {
  try {
    await Stream.findByIdAndDelete(req.params.id);
    res.json({ message: 'Stream deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Toggle Block / Maintain / Delete
app.patch('/streams/:id/toggle', async (req, res) => {
  try {
    const updates = {};
    const allowed = ['blocked', 'deleted', 'maintained', 'free'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    updates.updated_at = new Date();

    const updatedStream = await Stream.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedStream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ message: 'Stream updated', stream: updatedStream });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Mongoose Schema
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // HTML content
  images: [String],
  audios: [String],
  author: { type: String },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Route files based on MIME type
    if (file.mimetype.startsWith('image/')) {
      cb(null, 'uploads/images');
    } else if (file.mimetype.startsWith('audio/')) {
      cb(null, 'uploads/audios');
    } else {
      cb(new Error('Unsupported file type'), false);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// API: Publish Article
app.post(
  '/api/admin/publish-article',
  upload.fields([  { name: 'images', maxCount: 10 },
    { name: 'audios', maxCount: 5 }]),

  async (req, res) => {
    try {
      const { title, content, author, isPublished } = req.body;

      const images = req.files['images']?.map(file => file.path) || [];
      const audios = req.files['audios']?.map(file => file.path) || [];

      const article = new Article({
        title,
        content,
        images,
        audios,
        author,
        isPublished: isPublished === 'true'
      });

      await article.save();

      res.status(201).json({
        success: true,
        message: 'Article published successfully!',
        article
      });
    } catch (error) {
      console.error('Error publishing article:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish article',
        error: error.message
      });
    }
  }
);

// GET: All Articles (optionally filter published)
app.get('/api/articles', async (req, res) => {
  try {
    const { onlyPublished } = req.query;

    const filter = onlyPublished === 'true' ? { isPublished: true } : {};

    const articles = await Article.find(filter).sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      count: articles.length,
      articles
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: error.message
    });
  }
});



// Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
