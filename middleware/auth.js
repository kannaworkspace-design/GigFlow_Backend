const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
  try {
    const token = req.cookies.token // cookie name = "token"

    if (!token) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.userId = decoded.userId // we stored { userId: user._id } in token
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' })
  }
}

module.exports = auth
