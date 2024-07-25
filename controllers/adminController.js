const MovieUser = require('../models/MovieUser');
const Kyc = require('../models/Kyc');
const UserInteraction = require('../models/UserInteraction');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await MovieUser.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        // Remove user interactions
        await UserInteraction.deleteMany({ user: userId });
        
        // Remove KYC information
        await Kyc.deleteMany({ user: userId });

        // Remove user
        await MovieUser.findByIdAndDelete(userId);

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};
