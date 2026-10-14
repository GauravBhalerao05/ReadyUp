const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, companyController.getCompanies);
router.get('/:slug', authenticate, companyController.getCompanyBySlug);

module.exports = router;
