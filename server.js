import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog'
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// Article Schema
const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

const Article = mongoose.model('Article', articleSchema)

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }
    req.user = user
    next()
  })
}

// Routes
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 })
    res.json(articles)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching articles' })
  }
})

app.get('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json(article)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching article' })
  }
})

app.post('/api/articles', authenticateToken, async (req, res) => {
  try {
    const article = new Article(req.body)
    await article.save()
    res.status(201).json(article)
  } catch (error) {
    res.status(400).json({ error: 'Error creating article' })
  }
})

app.put('/api/articles/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json(article)
  } catch (error) {
    res.status(400).json({ error: 'Error updating article' })
  }
})

app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id)
    if (!article) {
      return res.status(404).json({ error: 'Article not found' })
    }
    res.json({ message: 'Article deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Error deleting article' })
  }
})

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body
  
  // You should change this to your desired password
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
  
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { admin: true },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )
    res.json({ success: true, token })
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' })
  }
})

app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ authenticated: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
