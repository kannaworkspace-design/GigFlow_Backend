const express = require('express')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const cors = require('cors')
require('dotenv').config()

const bidRoutes = require('./routes/bids')
const gigRoutes = require('./routes/gigs')
const auth = require('./middleware/auth')
const authRoutes = require('./routes/auth')

const app = express()

app.use(express.json())
app.use(cookieParser())

app.set('trust proxy', 1) // important on Render/behind proxy

const FRONTEND_URL = process.env.FRONTEND_URL

app.use(cors({
  origin: FRONTEND_URL,     // e.g. https://your-frontend.vercel.app
  credentials: true
}))



app.use('/api/auth', authRoutes)
app.use('/api/gigs', gigRoutes)
app.use('/api/bids', bidRoutes)



// ✅ Protected test route (put before listen)
app.get('/api/protected', auth, (req, res) => {
  res.json({ message: 'You are authorized', userId: req.userId })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
