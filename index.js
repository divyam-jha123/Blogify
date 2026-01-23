require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const { checkForAuthenticationCookie } = require('./middlewares/auth');
const { verifyUser } = require('./service/authentication');

const Blog = require('./models/blog');

const connectDb = require('./db/connection');

const port = process.env.PORT;

const userRoute = require('./routes/user');
const blogsRoute = require('./routes/blog');


app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

app.set("view engine", "ejs");
app.set("views", path.resolve('./views'));

app.get('/', async (req, res) => {

    if (!req.user) {
        return res.redirect('/user/signup');
    }

    const blogs = await Blog.find({}).sort({ createdAt: -1 });

    return res.render('homepage', {
        user: req.user,
        blogs,
    });
});

app.use('/user', userRoute)
app.use('/blog', blogsRoute);



const start = async () => {
    try {
        await connectDb(process.env.MONGO_URI);

        app.listen(port, () => {
            console.log(`server is running at port: ${port}`);
        });

    } catch (error) {
        console.log(error);
    }
}

start();