const mongoose = require("mongoose");

const InviteData = mongoose.model('InviteData', new mongoose.Schema({
    guildID: String,
    userID: String,
    GuildInvites: Number,
    inviter: String,
    Total: Number,
    Fake: Number,
    Regular: Number,
    Left: Number,
}));

module.exports = { InviteData };