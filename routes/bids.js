const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const Bid = require('../models/Bid')
const Gig = require('../models/Gig')

// ✅ APPLY to a gig (create bid)
router.post('/', auth, async (req, res) => {
  try {
    const { gigId, bidAmount, message } = req.body

    if (!gigId || !bidAmount || !message) {
      return res.status(400).json({ message: 'gigId, bidAmount, message are required' })
    }

    // prevent applying twice to same gig
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
    res.status(500).json({ message: 'Server error' })
  }
})

// ✅ GET all bids for a gig (OWNER sees applicants)
router.get('/:gigId', auth, async (req, res) => {
  try {
    const { gigId } = req.params
    const bids = await Bid.find({ gigId }).sort({ createdAt: -1 })
    res.json({ bids })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ✅ GET my bids (APPLICANT sees status: pending/hired/rejected)
router.get('/mine/list', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ applicantId: req.userId })
      .sort({ createdAt: -1 })
      .select('gigId status bidAmount message createdAt')

    res.json({ bids })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ✅ HIRE one bid (OWNER action)
router.patch('/:bidId/hire', auth, async (req, res) => {
  try {
    const { bidId } = req.params

    const bid = await Bid.findById(bidId)
    if (!bid) return res.status(404).json({ message: 'Bid not found' })

    const gig = await Gig.findById(bid.gigId)
    if (!gig) return res.status(404).json({ message: 'Gig not found' })

    // only owner can hire
    if (String(gig.ownerId) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not allowed' })
    }

    // set selected bid to hired
    bid.status = 'hired'
    await bid.save()

    // reject other bids for same gig
    await Bid.updateMany(
      { gigId: bid.gigId, _id: { $ne: bid._id } },
      { $set: { status: 'rejected' } }
    )

    // mark gig closed
    gig.status = 'closed'
    await gig.save()

    res.json({ message: 'Hired successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
