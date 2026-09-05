require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { User, Post } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/social_media_dashboard';

app.use(express.json());
app.use(cookieParser());

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------- Middleware ----------
function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// ---------- Auth Routes ----------

// Register
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(201).json({ message: 'User registered successfully.', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ message: 'Login successful.', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

// Logout
app.post('/logout', authenticateJWT, (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logout successful. Session removed.' });
});

// ---------- Post Routes (protected) ----------

// Create post
app.post('/post', authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content must be a non-empty string.' });
    }

    const newPost = new Post({ content, author: req.user.id });
    await newPost.save();

    return res.status(201).json({ message: 'Post created successfully.', post: newPost });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while creating post.' });
  }
});

// Get posts with pagination
app.get('/posts', authenticateJWT, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    return res.status(200).json({
      page,
      limit,
      totalPosts: total,
      totalPages: Math.ceil(total / limit),
      posts
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while fetching posts.' });
  }
});

// Edit post
app.put('/post/:id', authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'Post content must be a non-empty string.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to edit this post.' });
    }

    post.content = content;
    await post.save();

    return res.status(200).json({ message: 'Post updated successfully.', post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while updating post.' });
  }
});

// Delete post
app.delete('/post/:id', authenticateJWT, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this post.' });
    }

    await post.deleteOne();
    return res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error while deleting post.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});