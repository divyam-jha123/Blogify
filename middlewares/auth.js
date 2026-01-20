const jwt = require('jsonwebtoken');
const { verifyUser } = require('../service/authentication');

const checkForAuthenticationCookie = (cookieName) => {
    return (req, res, next) => {
        const tokenCookieValue = req.cookies[cookieName];
        if (!tokenCookieValue) {
            req.isAuth = false;
            return next();
        }

        try {
            const userPayload = verifyUser(tokenCookieValue);
            // storing teh users info in the server
            req.user = userPayload;
        } catch (error) { }
        return next();
    };
}

const restrictToLoggedinUserOnly = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/user/login');
    }
    return next();
}

module.exports = {
    checkForAuthenticationCookie,
    restrictToLoggedinUserOnly,
};