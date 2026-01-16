const express = require('express')
const auth = require('../middleware/auth')
const Bid = require('../models/Bid')
const Gig = require('../models/Gig')

const router = express.Router()

// APPLY / SUBMIT A BID
router.post('/', auth, async (req, res) => {
  try {
    const { gigId, message, bidAmount } = req.body

    if (!gigId || !message || bidAmount === undefined) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // check gig exists
    const gig = await Gig.findById(gigId)
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' })
    }

    // cannot bid on own gig
    if (gig.ownerId.toString() === req.userId) {
      return res.status(400).json({ message: "You can't bid on your own gig" })
    }

    // only allow bids on open gigs
    if (gig.status !== 'open') {
      return res.status(400).json({ message: 'This gig is not open for bidding' })
    }

    // prevent multiple bids by same user on same gig
    const existingBid = await Bid.findOne({ gigId, freelancerId: req.userId })
    if (existingBid) {
      return res.status(400).json({ message: 'You already bid on this gig' })
    }

    const bid = new Bid({
      gigId,
      freelancerId: req.userId,
      message,
      bidAmount,
      status: 'pending',
    })

    await bid.save()

    res.status(201).json({ message: 'Bid submitted successfully', bid })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})


// GET ALL BIDS FOR A GIG (OWNER ONLY)
router.get('/:gigId', auth, async (req, res) => {
  try {
    const { gigId } = req.params

    // check gig exists
    const gig = await Gig.findById(gigId)
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' })
    }

    // only owner can view bids
    if (gig.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const bids = await Bid.find({ gigId })
      .populate('freelancerId', 'name email') // show bidder details
      .sort({ createdAt: -1 })

    res.json({ bids })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})


// HIRE A BID (OWNER ONLY)
router.patch('/:bidId/hire', auth, async (req, res) => {
  try {
    const { bidId } = req.params

    // 1) find the bid
    const bid = await Bid.findById(bidId)
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' })
    }

    // 2) find the gig for this bid
    const gig = await Gig.findById(bid.gigId)
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' })
    }

    // 3) only owner can hire
    if (gig.ownerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    // 4) gig must be open
    if (gig.status !== 'open') {
      return res.status(400).json({ message: 'Gig already assigned' })
    }

    // 5) update gig status
    gig.status = 'assigned'
    await gig.save()

    // 6) set chosen bid to hired
    bid.status = 'hired'
    await bid.save()

    // 7) reject all other bids for same gig
    await Bid.updateMany(
      { gigId: bid.gigId, _id: { $ne: bid._id } },
      { $set: { status: 'rejected' } }
    )

    res.json({ message: 'Bid hired successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/mine', auth, async (req, res) => {
  try {
    const bids = await Bid.find({ applicantId: req.userId })
      .sort({ createdAt: -1 })
      .select('gigId status bidAmount message createdAt')

    res.json({ bids })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})




module.exports = router
