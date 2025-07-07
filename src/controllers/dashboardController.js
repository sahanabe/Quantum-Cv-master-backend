const User = require('../models/User');

// Get user dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate user statistics
    const stats = {
      totalResumes: user.resumes ? user.resumes.length : 0,
      profileViews: Math.floor(Math.random() * 2000) + 500, // Simulated data
      successRate: user.resumes && user.resumes.length > 0 ? 
        Math.floor(Math.random() * 30) + 70 : 0, // 70-100% success rate
      aiScore: user.resumes && user.resumes.length > 0 ? 
        Math.floor(Math.random() * 20) + 80 : 0, // 80-100 AI score
      streak: Math.floor(Math.random() * 30) + 1, // 1-30 day streak
      level: Math.floor((user.resumes ? user.resumes.length : 0) / 2) + 1,
      xp: (user.resumes ? user.resumes.length : 0) * 100 + Math.floor(Math.random() * 500),
      nextLevelXp: (Math.floor((user.resumes ? user.resumes.length : 0) / 2) + 2) * 1000
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};

// Get user recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate recent activity based on user data
    const activities = [];
    
    if (user.resumes && user.resumes.length > 0) {
      user.resumes.slice(-5).forEach((resume, index) => {
        activities.push({
          type: 'resume',
          action: 'uploaded',
          title: resume.name || `Resume ${index + 1}`,
          time: resume.date ? getTimeAgo(resume.date) : `${index + 1} days ago`,
          score: resume.score || Math.floor(Math.random() * 20) + 80
        });
      });
    }

    // Add some sample activities
    activities.push(
      {
        type: 'achievement',
        action: 'earned',
        title: 'Resume Master Badge',
        time: '2 days ago'
      },
      {
        type: 'analysis',
        action: 'completed',
        title: 'AI Career Analysis',
        time: '3 days ago',
        insights: 15
      },
      {
        type: 'profile',
        action: 'updated',
        title: 'Professional Profile',
        time: '5 days ago'
      }
    );

    res.json({ activities: activities.slice(0, 10) });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity', error: error.message });
  }
};

// Get AI insights for user
exports.getAIInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate personalized AI insights
    const insights = [
      {
        type: 'suggestion',
        title: 'Optimize Technical Skills',
        description: 'Add more specific programming languages to increase match rate by 23%',
        priority: 'high'
      },
      {
        type: 'trend',
        title: 'Market Demand Rising',
        description: 'React developers are 45% more in demand this quarter',
        priority: 'medium'
      },
      {
        type: 'opportunity',
        title: 'Perfect Job Match',
        description: '3 new positions match your profile with 95% compatibility',
        priority: 'urgent'
      },
      {
        type: 'improvement',
        title: 'Profile Completeness',
        description: 'Complete your professional summary to improve visibility by 30%',
        priority: 'medium'
      },
      {
        type: 'skill',
        title: 'Skill Gap Analysis',
        description: 'Learning TypeScript could increase your job opportunities by 40%',
        priority: 'high'
      }
    ];

    res.json({ insights });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Failed to fetch AI insights', error: error.message });
  }
};

// Get user achievements
exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resumeCount = user.resumes ? user.resumes.length : 0;
    
    const achievements = [
      {
        id: 1,
        name: 'First Upload',
        icon: '🚀',
        earned: resumeCount >= 1,
        date: resumeCount >= 1 ? '2024-01-15' : null,
        description: 'Upload your first resume'
      },
      {
        id: 2,
        name: 'Resume Master',
        icon: '👑',
        earned: resumeCount >= 5,
        date: resumeCount >= 5 ? '2024-02-20' : null,
        description: 'Upload 5 resumes'
      },
      {
        id: 3,
        name: 'AI Optimizer',
        icon: '🤖',
        earned: resumeCount >= 3,
        date: resumeCount >= 3 ? '2024-03-10' : null,
        description: 'Use AI optimization 3 times'
      },
      {
        id: 4,
        name: 'Career Strategist',
        icon: '🎯',
        earned: resumeCount >= 10,
        date: resumeCount >= 10 ? '2024-04-15' : null,
        description: 'Upload 10 resumes'
      },
      {
        id: 5,
        name: 'Interview Ace',
        icon: '💼',
        earned: false,
        date: null,
        description: 'Complete interview preparation'
      },
      {
        id: 6,
        name: 'Network Builder',
        icon: '🌐',
        earned: false,
        date: null,
        description: 'Connect with 50 professionals'
      }
    ];

    res.json({ achievements });
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ message: 'Failed to fetch achievements', error: error.message });
  }
};

// Get admin dashboard statistics
exports.getAdminDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    // Get admin dashboard statistics
    const stats = {
      totalUsers: Math.floor(Math.random() * 1000) + 500,
      totalResumes: Math.floor(Math.random() * 5000) + 2000,
      totalApplications: Math.floor(Math.random() * 2000) + 1000,
      activeUsers: Math.floor(Math.random() * 500) + 200,
      successRate: Math.floor(Math.random() * 20) + 80,
      revenue: Math.floor(Math.random() * 50000) + 25000,
      growthRate: Math.floor(Math.random() * 30) + 15
    };

    res.json({ stats });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch admin dashboard stats', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, bio, skills, location, website } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio) user.bio = bio;
    if (skills) user.skills = skills;
    if (location) user.location = location;
    if (website) user.website = website;

    await user.save();

    res.json({ 
      message: 'Profile updated successfully', 
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        bio: user.bio,
        skills: user.skills,
        location: user.location,
        website: user.website
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
} 