const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const Bid = require('../models/Bid')
const Gig = require('../models/Gig')

// ✅ APPLY (create bid)
router.post('/', auth, async (req, res) => {
  try {
    const { gigId, bidAmount, message } = req.body

    if (!gigId || !bidAmount || !message) {
      return res.status(400).json({ message: 'gigId, bidAmount, message are required' })
    }

    const existing = await Bid.findOne({ gigId, applicantId: req.userId })
    if (existing) {
      return res.status(400).json({ message: 'You already applied for this gig' })
    }

    const bid = await Bid.create({
      gigId,
      applicantId: req.userId,
      bidAmount,
      message,
      status: 'pending',
    })

    res.status(201).json({ message: 'Applied successfully', bid })
  } catch (err) {
    console.error('POST /api/bids ERROR:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// ✅ MY BIDS (show statuses for my applications)
router.get('/mine/list', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ applicantId: req.userId })
      .sort({ createdAt: -1 })
      .select('gigId status bidAmount message createdAt')

    res.json({ bids })
  } catch (err) {
    console.error('GET /api/bids/mine/list ERROR:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// ✅ GET bids for a gig (owner sees applicants) — SAFE PATH
router.get('/gig/:gigId', auth, async (req, res) => {
  try {
    const { gigId } = req.params
    const bids = await Bid.find({ gigId }).sort({ createdAt: -1 })
    res.json({ bids })
  } catch (err) {
    console.error('GET /api/bids/gig/:gigId ERROR:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// ✅ HIRE one bid
router.patch('/:bidId/hire', auth, async (req, res) => {
  try {
    const { bidId } = req.params

    const bid = await Bid.findById(bidId)
    if (!bid) return res.status(404).json({ message: 'Bid not found' })

    const gig = await Gig.findById(bid.gigId)
    if (!gig) return res.status(404).json({ message: 'Gig not found' })

    if (String(gig.ownerId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not allowed' })
    }

    bid.status = 'hired'
    await bid.save()

    await Bid.updateMany(
      { gigId: bid.gigId, _id: { $ne: bid._id } },
      { $set: { status: 'rejected' } }
    )

    gig.status = 'closed'
    await gig.save()

    res.json({ message: 'Hired successfully' })
  } catch (err) {
    console.error('PATCH /api/bids/:bidId/hire ERROR:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

module.exports = router
