const express = require('express')
const Gig = require('../models/Gig')
const auth = require('../middleware/auth')

const router = express.Router()

// CREATE A GIG (Job Posting)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, budget } = req.body

    if (!title || !description || budget === undefined) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const gig = new Gig({
      title,
      description,
      budget,
      ownerId: req.userId, // comes from middleware
      status: 'open',
    })

    await gig.save()

    res.status(201).json({ message: 'Gig created successfully', gig })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET ALL OPEN GIGS (with optional search)
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query

    const query = {
      status: 'open',
      ownerId: { $ne: req.userId }, // exclude my own gigs
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' } // case-insensitive
    }

    const gigs = await Gig.find(query).sort({ createdAt: -1 })

    res.json({ gigs })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
