const MovieUser = require('../models/MovieUser');
const Kyc = require('../models/Kyc');
const bcrypt = require('bcryptjs');
const useragent = require('express-useragent');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Email sending utility function
async function sendEmail(recipientEmail, subject, greeting, message, code) {
  const templatePath = path.join(__dirname, '..', 'templates', 'codeTemplate.html');
  let htmlContent = fs.readFileSync(templatePath, 'utf8');

  htmlContent = htmlContent.replace('{{greeting}}', greeting)
    .replace('{{message}}', message)
    .replace('{{code}}', code);

  let transporter = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 587,
    secure: false,
    auth: {
      user: 'support@verdantcharity.org',
      pass: 'Lahaja2169#',
    },
  });

  let info = await transporter.sendMail({
    from: '"Movie Recommendation System" <support@verdantcharity.org>',
    to: recipientEmail,
    subject: subject,
    text: `${greeting}\n\n${message}\n\nCode: ${code}`,
    html: htmlContent,
  });

  console.log("Message sent: %s", info.messageId);
}

// Example function to send SMS
const sendSms = async (phoneNumber, message) => {
  const url = "https://sms.textsms.co.ke/api/services/sendsms/";
  const data = {
    apikey: '5cb230d925cbc5451e1a05ccf2a03f24',
    partnerID: 5357,
    message: message,
    shortcode: 'WINSOFT',
    mobile: phoneNumber
  };

  const options = {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(data)
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return result; // You might want to handle the result based on your needs
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
};

// Utility functions to generate unique information for the user
const adjectives = [
  'Adorable', 'Brave', 'Calm', 'Adventurous', 'Charming', 'Dazzling', 'Elegant', 'Fierce', 
  'Graceful', 'Heroic', 'Inventive', 'Joyful', 'Kind', 'Lively', 'Majestic', 'Noble', 
  'Optimistic', 'Proud', 'Quirky', 'Radiant', 'Serene', 'Thoughtful', 'Unique', 'Vibrant', 'Wise'
];
const nouns = [
  'Panda', 'Lion', 'Eagle', 'Unicorn', 'Dragon', 'Tiger', 'Phoenix', 'Dolphin', 
  'Wolf', 'Falcon', 'Bear', 'Fox', 'Hawk', 'Whale', 'Shark', 'Jaguar',
  'Leopard', 'Zebra', 'Elephant', 'Rabbit', 'Kangaroo', 'Koala', 'Squirrel', 'Owl'
];

function generateRandomUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adj}${noun}${number}`;
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error('No phone number provided');
  }

  // Check for expected formats and modify accordingly
  if (phoneNumber.startsWith("+")) {
    return phoneNumber.slice(1); // remove the '+' prefix
  } else if (phoneNumber.startsWith("254")) {
    return phoneNumber;
  } else if (phoneNumber.startsWith("0")) {
    return `254${phoneNumber.slice(1)}`;
  } else if (phoneNumber.startsWith("7") || phoneNumber.startsWith("1")) {
    return `254${phoneNumber}`;
  } else {
    return phoneNumber;
  }
};

exports.signupUser = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  let { email, phoneNumber, password } = req.body;

  if (!email || !phoneNumber || !password) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  // Convert email to lowercase
  email = email.toLowerCase();

  // Check if the email domain is allowed
  const allowedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.com'];
  const isDomainAllowed = allowedDomains.some(domain => email.endsWith(domain));
  if (!isDomainAllowed) {
    return res.status(400).json({ message: 'Email domain not allowed.' });
  }

  const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

  try {
    const existingUser = await MovieUser.findOne({
      $or: [{ email }, { phoneNumber: formattedPhoneNumber }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with the provided email or phone number.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = generateRandomUsername();
    const otp = generateOtp();

    const newUser = new MovieUser({
      email, // This is now the lowercase email
      phoneNumber: formattedPhoneNumber,
      password: hashedPassword,
      username,
      otp,
    });

    const savedUser = await newUser.save();

    return res.status(201).json({
      message: 'User created successfully!',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email, // This is now the lowercase email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
    let { email, password, fingerprintId } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',').shift() || req.ip || req.connection.remoteAddress;
    const agentString = req.headers['user-agent'];
    const agent = useragent.parse(agentString);

    email = email.toLowerCase();

    try {
        const user = await MovieUser.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const browserWithVersion = agent.browser + (agent.version ? ` ${agent.version}` : '');
        const trackingInfoLength = user.trackingInfo.length;

        const newTrackingInfo = {
            fingerprintId: fingerprintId,
            userIp: ip,
            browser: browserWithVersion,
            os: agent.os.toString(),
            platform: agent.platform,
            device: agent.isMobile ? 'Mobile' : (agent.isTablet ? 'Tablet' : 'Desktop'),
        };

        if (trackingInfoLength === 0) {
            user.trackingInfo.push(newTrackingInfo);
        } else if (user.trackingInfo[trackingInfoLength - 1].fingerprintId !== fingerprintId) {
            user.trackingInfo[trackingInfoLength - 1] = newTrackingInfo;
        }

        user.lastLogin = new Date();

        if (!user.isVerified) {
            const newVerificationCode = generateOtp();
            user.otp = newVerificationCode;
            await user.save();

            const subject = "Verification Needed";
            const greeting = "Hello,";
            const message = "Please verify your email to continue by entering the following code:";

            await sendEmail(user.email, subject, greeting, message, newVerificationCode);

            return res.status(403).json({
                message: 'Verification needed. Please check your email for the verification code.',
                token: token
            });
        }

        if (!user.isPhoneVerified) {
            const newOtp = generateOtp();
            user.otp = newOtp;
            await user.save();

            const smsMessage = `Your verification code is: ${newOtp}`;
            await sendSms(user.phoneNumber, smsMessage);

            return res.status(403).json({
                message: 'Phone verification needed. Please check your messages for the verification code.',
                token: token,
                phoneNumber: user.phoneNumber
            });
        }

        const kycData = await Kyc.findOne({ user: user._id });
        console.log('KYC Data:', kycData);
        console.log('User ID:', user._id);

        if (!kycData || !kycData.firstName) {
            console.log('KYC data or first name not found');
            return res.status(200).json({
                token: token,
                redirectToOnboarding: true
            });
        }

        const userData = {
            _id: user._id,
            username: user.username,
            profileImage: user.profileImage,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            isVerified: user.isVerified,
            isPhoneVerified: user.isPhoneVerified,
            isPremium: user.isPremium,
            token,
        };

        console.log('User Data:', userData);
        return res.status(200).json(userData);
    } catch (error) {
        console.error('Login error', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

exports.changePassword = async (req, res) => {
  const userId = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.trim() === '') {
    return res.status(400).json({ message: "New password must not be empty." });
  }

  try {
    const user = await MovieUser.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.verifyFirstTimeUser = async (req, res) => {
  let { email, verificationCode } = req.body;

  // Convert email to lowercase to ensure case-insensitive matching
  email = email.toLowerCase();

  try {
    const user = await MovieUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the provided verification code matches the one saved in the user's document
    if (user.otp !== verificationCode) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    user.isVerified = true;
    const newCode = generateOtp(); // Ensure newCode is declared properly
    user.otp = newCode;
    await user.save();

    return res.status(200).json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error('First time user verification error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Function to verify user's phone number
exports.verifyPhoneNumber = async (req, res) => {
  const { phoneNumber, verificationCode } = req.body;

  try {
    const user = await MovieUser.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the provided verification code matches the one saved in the user's document
    if (user.otp !== verificationCode) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    user.isPhoneVerified = true; // Mark the phone number as verified
    const newCode = generateOtp(); // Assuming you regenerate the OTP for security reasons
    user.otp = newCode; // Save the new OTP or clear the field as per your application logic
    await user.save();

    return res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Phone number verification error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  let { email } = req.body;

  // Convert email to lowercase to ensure case-insensitive matching
  email = email.toLowerCase();

  try {
    const user = await MovieUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email.' });
    }

    // Check if a reset code already exists and use it, otherwise generate a new one
    let resetCode = user.otp;
    if (!resetCode) {
      resetCode = generateOtp(); // Generate a secure token or code
      user.otp = resetCode;
      await user.save();
    }

    // Prepare email content
    const subject = "Password Reset Code";
    const greeting = "Dear user,";
    const message = `Please use the following code to proceed with resetting your password: ${resetCode}`;

    // Send the code via email
    await sendEmail(user.email, subject, greeting, message, resetCode);

    return res.status(200).json({ message: 'A verification code has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.verifyResetCode = async (req, res) => {
  let { email, code } = req.body;

  // Convert email to lowercase to ensure case-insensitive matching
  email = email.toLowerCase();

  try {
    const user = await MovieUser.findOne({ email });
    if (!user || user.otp !== code) { // Check if user exists and code matches
      return res.status(400).json({ message: 'Verification failed. Invalid code or email.' });
    }

    // Code is valid, generate and save new code for next use
    user.otp = generateOtp();
    await user.save();

    return res.status(200).json({ message: 'Verification successful', verified: true });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  let { email, newPassword } = req.body;

  // Convert email to lowercase to ensure case-insensitive matching
  email = email.toLowerCase();

  try {
    const user = await MovieUser.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.changePhoneNumber = async (req, res) => {
  const { oldPhone, newPhone } = req.body;

  // Validation: Check if newPhone is not empty and is valid
  if (!newPhone || newPhone.trim() === '') {
    return res.status(400).json({ message: 'The new phone number is required.' });
  }

  // Format the old and new phone numbers
  const formattedOldPhone = formatPhoneNumber(oldPhone);
  const formattedNewPhone = formatPhoneNumber(newPhone);

  try {
    // Check if the new phone number is already in use by another user
    const phoneInUse = await MovieUser.findOne({ phoneNumber: formattedNewPhone });
    if (phoneInUse) {
      return res.status(409).json({ message: 'The new phone number is already in use.' });
    }

    // Find the user based on the formatted old phone number
    const user = await MovieUser.findOne({ phoneNumber: formattedOldPhone });
    if (!user) {
      return res.status(404).json({ message: 'User not found with the specified old phone number.' });
    }

    // Update the user's phone number with the formatted new phone number
    user.phoneNumber = formattedNewPhone;
    user.otpResendAttempts = 0;
    user.otpNextResendTime = undefined;
    user.isPhoneVerified = false; // Optionally reset phone verification status

    // Generate a new OTP for phone verification and save it to the user
    const newVerificationCode = generateOtp();
    user.otp = newVerificationCode;

    await user.save();

    // Optionally, send a new OTP via SMS to the formatted new phone number
    const smsMessage = `Your new verification code is: ${newVerificationCode}`;
    await sendSms(formattedNewPhone, smsMessage);

    return res.status(200).json({
      message: 'Phone number changed successfully. A new verification code has been sent to the new phone number.'
    });
  } catch (error) {
    console.error('Change phone number error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

  
 // Resend reset code
exports.resendResetCode = async (req, res) => {
    let { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email' });
    }
  
    email = email.toLowerCase();
  
    try {
      const user = await MovieUser.findOne({ email });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the temporary ban period has elapsed
      if (user.otpNextResendTime && user.otpNextResendTime > new Date()) {
        const timeLeft = (user.otpNextResendTime.getTime() - new Date().getTime()) / 1000 / 60;
        return res.status(429).json({ message: `Too many attempts. Try again in ${Math.ceil(timeLeft)} minutes.` });
      } else if (user.otpNextResendTime && user.otpNextResendTime <= new Date()) {
        user.otpResendAttempts = 0;
        user.otpNextResendTime = undefined;
      }
  
      if (user.otpResendAttempts < 4) {
        user.otpResendAttempts += 1;
      } else {
        // Reset attempts and set next allowed resend time to 2 hours from now
        user.otpResendAttempts = 0;
        user.otpNextResendTime = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
        await user.save();
        return res.status(429).json({ message: 'Too many attempts. Please try again in 2 hours.' });
      }
  
      const newVerificationCode = generateOtp();
      user.otp = newVerificationCode;
      await user.save();
  
      // Send the new code via email
      const emailSubject = "Resend Verification Code";
      const emailGreeting = "Dear user,";
      const emailMessage = `You have requested to resend your verification code. Please use the following code: ${newVerificationCode}`;
      await sendEmail(user.email, emailSubject, emailGreeting, emailMessage, newVerificationCode);
  
      return res.status(200).json({ message: 'A new verification code has been sent to your email.' });
    } catch (error) {
      console.error('Resend verification code error:', error);
      return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  };
  
  

exports.getUserInfo = async (req, res) => {
  const userId = req.user; 

  try {
    const user = await MovieUser.findById(userId).select('-password'); 
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prepare user data
    const userData = {
      _id: user._id,
      username: user.username,
      profileImage: user.profileImage,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      isPhoneVerified: user.isPhoneVerified,
      isPremium: user.isPremium,
    };

    // Respond with user data
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
