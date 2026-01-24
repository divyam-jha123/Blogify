const { Router } = require('express');
const User = require('../models/user');
const Blog = require('../models/blog');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { createToken, verifyUser } = require('../service/authentication');
const { restrictToLoggedinUserOnly } = require('../middlewares/auth');

const bcrypt = require('bcrypt');
const { ReturnDocument } = require('mongodb');

const router = Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    }

})

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

        const isMatch = await bcrypt.compare(
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
            error: 'Invalid email or password,signup',
        })
    }
});

// forget page

router.get('/forgetPass', (req, res) => {
    return res.render('forgetPass');
});

router.post('/forgetPass', async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        // Validate input fields
        if (!email || !newPassword || !confirmPassword) {
            return res.render('forgetPass', {
                error: 'All fields are required'
            });
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.render('forgetPass', {
                error: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.render('forgetPass', {
                error: 'Password must be at least 6 characters long'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.render('forgetPass', {
                error: 'User not found with this email address'
            });
        }
        user.password = newPassword;
        await user.save();

        return res.render('login', {
            success: 'Password updated successfully'
        })
    } catch (error) {
        console.error('Error updating password:', error);
        return res.render('forgetPass', {
            error: 'An error occurred. Please try again later.'
        });
    }
});

router.get('/profile', restrictToLoggedinUserOnly, async (req, res) => {

    const blogs = await Blog.find({ createdBy: req.user._id });

    return res.render('profile', {
        user: req.user,
        blogs,
    });
});

router.post('/upload-profile-image', restrictToLoggedinUserOnly, upload.single('profileImage'), async (req, res) => {

    let profileImage = '';

    try {

        // uplorad to cloudinary

        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: 'profile_images',
            resource_type: 'auto',
        });

        profileImage = uploadResult.secure_url;

        const updatedUser = await User.findByIdAndUpdate(req.user._id, {
            profileImageURL: profileImage
        },
            { new: true });

        const token = createToken(updatedUser);

        return res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 60 * 60 * 1000,
            sameSite: 'strict'
        }).json({
            msg: 'profile image uploaded successfully',
            profileImageURL: updatedUser.profileImageURL
        });

    } catch (error) {

        console.log("error:", error);
        return res.status(500).send('Error uploading profile image. Please try again.');

    }
})




module.exports = router;