const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      name,
      email,
      password: hashedPassword,
    })

    await user.save()

    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
     console.error('LOGIN ERROR:', error)
     res.status(500).json({ message: 'Server error' })
  }
})

// LOGIN (COOKIE BASED)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    // 🔑 STORE TOKEN IN COOKIE
    
    const isProd = process.env.NODE_ENV === 'production'

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,                 // true on https (production)
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    })

    res.json({ message: 'Login successful' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
