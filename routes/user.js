const { Router } = require('express');
const User = require('../models/user');
const { createToken, verifyUser } = require('../service/authentication');
const { compare } = require('bcrypt');

const router = Router();

router.get('/signup', (req, res) => {
    return res.render('signup');
});

router.get('/login', (req, res) => {
    return res.render('login');
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.redirect('/user/login');
});

router.post('/signup', async (req, res) => {
    try {
        const { userName, email, password } = req.body;

        const checkUser = await User.findOne({
            email,
        });

        if (checkUser) {
            return res.redirect('/user/login');
        }

        const user = await User.create({
            userName,
            email,
            password,
        });

        return res.redirect('/user/login');


    } catch (error) {
        console.error('Signup error:', error);
        return res.render('signup', {
            error: 'Signup failed. Please try again.'
        });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({
            email: email,
        })

        if (!user) {
            return res.render('login', {
                error: 'Invalid email or password'
            });
        }

        const isMatch = await compare(
            password,
            user.password,
        )

        if (!isMatch) {
            return res.render('login', {
                error: 'Invalid email or password'
            });
        }

        const token = createToken(user);

        // Store token in cookie
        return res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 60 * 1000,
            sameSite: 'strict'
        }).redirect('/');

    } catch (error) {
        return res.render('login', {
            error: 'Invalid email or password',
        })
    }
});



module.exports = router;