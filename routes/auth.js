const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

// helper: cookie options must match for set + clear
const cookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax', // important for cross-site
    secure: isProd,                   // true on https (Render)
    path: '/',                        // must match for clearCookie
  }
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(400).json({ message: 'User already exists' })

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({ name, email, password: hashedPassword })
    await user.save()

    res.status(201).json({ message: 'User registered successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// LOGIN (COOKIE BASED)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' })

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    // ✅ set cookie with consistent options
    res.cookie('token', token, cookieOptions())

    // ✅ send name so frontend can show it
    res.json({
      message: 'Login successful',
      user: { name: user.name }
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// LOGOUT (COOKIE CLEAR)
router.post('/logout', (req, res) => {
  // ✅ MUST use same options as set cookie
  res.clearCookie('token', cookieOptions())
  res.json({ message: 'Logged out successfully' })
})

module.exports = router
