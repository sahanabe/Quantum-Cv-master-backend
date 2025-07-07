const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// All Reports: Analyze uploaded resume/report for selected category
// (Moved after router definition to avoid ReferenceError)
// router.post('/analyze-report', upload.single('file'), userController.analyzeReport);

// Forgot/Reset Password
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- Job Application Workflow ---
// User applies for a job (with CV upload)
router.post('/apply', auth, upload.single('cv'), userController.applyForJob);
// Admin: List all job applications
router.get('/admin/applications', auth, userController.listJobApplications);
// Admin: Approve/reject application
router.patch('/admin/applications/:id', auth, userController.updateJobApplicationStatus);
// User: List their own applications
router.get('/my-applications', auth, userController.listMyApplications);
// Admin: Get all users
// const auth = require('../middleware/auth'); // <-- REMOVE DUPLICATE
router.get('/admin/users', auth, userController.getAllUsers);
// Admin: Company verification management
router.get('/admin/pending-verifications', auth, userController.getPendingVerifications);
router.put('/admin/verify-company/:userId', auth, userController.updateCompanyVerification);
// Admin: Delete user
router.delete('/admin/users/:id', auth, userController.deleteUser);
// Admin: Add a new job
router.post('/admin/jobs', auth, userController.addJob);
// Public: List all jobs
router.get('/jobs', userController.listJobs);

// Register
router.post('/register', userController.register); // Registration disabled
// Login
router.post('/login', userController.login);
// Email verification

// router.get('/verify-email', userController.verifyEmail); // Email verification removed

// Save analyzed/uploaded resume to user profile
router.post('/user/save-resume', auth, userController.saveResume);
// Get all resumes for logged-in user
router.get('/user/resumes', auth, userController.getResumes);
// Admin: Get all resumes from all users
router.get('/admin/all-resumes', auth, userController.getAllResumes);

// Dashboard routes (require authentication)
router.get('/dashboard/stats', auth, dashboardController.getDashboardStats);
router.get('/dashboard/activity', auth, dashboardController.getRecentActivity);
router.get('/dashboard/insights', auth, dashboardController.getAIInsights);
router.get('/dashboard/achievements', auth, dashboardController.getAchievements);
router.put('/dashboard/profile', auth, dashboardController.updateProfile);

// Admin dashboard stats
router.get('/admin/dashboard-stats', auth, dashboardController.getAdminDashboardStats);

module.exports = router;
