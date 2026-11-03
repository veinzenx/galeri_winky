require('dotenv').config();
const jwt = require('jsonwebtoken');
const kataRahasia = process.env.JWT_SECRET;
const authJWT = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token) {
        const auth = token.split(' ')[1];
        jwt.verify(auth, kataRahasia, (err, user) => {
            if (err) {
                return res.status(403).json({
                    message: 'Token tidak valid'
                });
            }
            req.user = user;
            next();
        });
    } else {
        return res.sendStatus(401);
    }
};

module.exports = authJWT;