require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();
const { checkForAuthenticationCookie } = require('./middlewares/auth');
const { verifyUser } = require('./service/authentication');

const Blog = require('./models/blog');

const { renderMarkdown, markdownExcerpt, markdownReady } = require('./service/markdown');
const connectDb = require('./db/connection');
const { MongoMemoryServer } = require('mongodb-memory-server');

const port = process.env.PORT;

const userRoute = require('./routes/user');
const blogsRoute = require('./routes/blog');
const apiRoute = require('./routes/api');
const seriesRoute = require('./routes/series');


// Post bodies are Markdown; views render them through these rather than each
// route re-deriving the HTML.
app.locals.renderMarkdown = renderMarkdown;
app.locals.markdownExcerpt = markdownExcerpt;

app.use(express.json());
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

    const blogs = await Blog.find({}).sort({ createdAt: -1 }).populate('series', 'title slug');

    return res.render('homepage', {
        user: req.user,
        blogs,
    });
});

app.use('/user', userRoute)
app.use('/blog', blogsRoute);
app.use('/api', apiRoute);
app.use('/series', seriesRoute);



const start = async () => {
    try {
        let mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            console.log("MONGO_URI not found. Starting in-memory MongoDB...");
            const mongod = await MongoMemoryServer.create();
            mongoUri = mongod.getUri();
            console.log(`Using In-Memory MongoDB at: ${mongoUri}`);
        }

        await connectDb(mongoUri);

        // marked loads asynchronously; settle it before the first request so a
        // post never renders as unformatted plain text.
        await markdownReady;

        app.listen(port, () => {
            console.log(`server is running at port: ${port}`);
        });

    } catch (error) {
        console.log(error);
    }
}

start();