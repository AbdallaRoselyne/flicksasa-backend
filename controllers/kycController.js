const Kyc = require('../models/Kyc');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const sendWelcomeEmail = async (recipientEmail, firstName) => {
    const templatePath = path.join(__dirname, '..', 'templates', 'welcomeTemplate.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    htmlContent = htmlContent.replace('{{firstName}}', firstName);

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
        from: '"Flicksasa" <support@verdantcharity.org>',
        to: recipientEmail,
        subject: 'Welcome to Flicksasa',
        text: `Hello ${firstName},\n\nWelcome to our Movie Recommendation System! We are excited to have you with us.`,
        html: htmlContent,
    });

    console.log("Welcome email sent: %s", info.messageId);
}

const submitKyc = async (req, res) => {
    try {
        const { firstName, lastName, age, email, phone, country, favoriteGenres, devices, streamingServices } = req.body;
        const userId = req.user; // Extracted from the token in the authMiddleware

        // Check if KYC data already exists for the user
        let kycData = await Kyc.findOne({ user: userId });

        if (kycData) {
            // Update existing KYC data
            kycData.firstName = firstName;
            kycData.lastName = lastName;
            kycData.age = age;
            kycData.email = email;
            kycData.phone = phone;
            kycData.country = country;
            kycData.favoriteGenres = favoriteGenres;
            kycData.devices = devices;
            kycData.streamingServices = streamingServices;
            await kycData.save();
            res.status(200).json({ message: 'KYC data updated successfully' });
        } else {
            // Create new KYC data
            kycData = new Kyc({
                user: userId,
                firstName,
                lastName,
                age,
                email,
                phone,
                country,
                favoriteGenres,
                devices,
                streamingServices
            });
            await kycData.save();
             // Send welcome email
             await sendWelcomeEmail(email, firstName);
            res.status(201).json({ message: 'KYC data submitted successfully' });

           
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to submit KYC data', error: error.message });
    }
};

module.exports = { submitKyc };
