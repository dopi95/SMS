const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary.config');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const updateProfile = async (req, res) => {
  try {
    console.log('Profile update request:', {
      body: req.body,
      file: req.file ? 'File present' : 'No file',
      userId: req.user._id
    });

    const { name, email, phone, removePhoto } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const updateData = { name, email, phone: phone || '' };

    if (removePhoto === 'true') {
      updateData.profilePhoto = '';
    } else if (req.file) {
      try {
        console.log('Uploading to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'profile_photos',
          width: 300,
          height: 300,
          crop: 'fill',
          resource_type: 'auto'
        });
        updateData.profilePhoto = result.secure_url;
        console.log('Cloudinary upload successful:', result.secure_url);
        
        // Clean up temp file
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.log('Temp file cleanup error (non-critical):', cleanupError.message);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        if (req.file && req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.log('Temp file cleanup error:', cleanupError.message);
          }
        }
        return res.status(500).json({ message: 'Failed to upload image. Please try again.' });
      }
    }

    console.log('Updating user with data:', updateData);
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile updated successfully for user:', user._id);
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateProfile, changePassword, getProfile };