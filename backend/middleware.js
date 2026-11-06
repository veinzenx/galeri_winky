require('dotenv').config();
const jwt = require('jsonwebtoken');

const authJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({
            message: 'Silakan login terlebih dahulu'
        });
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            message: 'Gunakan format Authorization: Bearer <token>'
        });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({
            message: 'Konfigurasi JWT_SECRET belum tersedia'
        });
    }

    jwt.verify(token, secret, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: err.name === 'TokenExpiredError'
                    ? 'Sesi login kedaluwarsa. Silakan login kembali.'
                    : 'Token tidak valid'
            });
        }
        if (!Number.isFinite(user.exp)) {
            return res.status(403).json({
                message: 'Token lama tidak memiliki masa berlaku. Silakan login kembali.'
            });
        }
        req.user = user;
        next();
    });
};

module.exports = authJWT;
