require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const { checkForAuthenticationCookie } = require('./middlewares/auth');

const connectDb = require('./db/connection');

const port = process.env.PORT;

const userRoute = require('./routes/user');
const blogsRoute = require('./routes/blog');


app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

app.set("view engine", "ejs");
app.set("views", path.resolve('./views'));

app.get('/', (req, res) => {

    if (!req.user) {
        return res.redirect('/user/login');
    }

    return res.render('homepage', {
        user: req.user,
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