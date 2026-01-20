const { Router } = require('express');

const router = Router();

router.get('/add-new', (req, res) => {
    return res.render('addBlogs', {
        user: res.user,
    });
});

router.post('/', (req,res) => {
    console.log(req.body);

    // store the blog data in the data base.

    return res.redirect('/');
})

module.exports = router;